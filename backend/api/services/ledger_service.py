from decimal import Decimal
from django.db import transaction
from django.utils import timezone
import uuid
from api.models import StockLedgerEntry, Product

def record_stock_ledger_entry(
    product_id,
    warehouse_id,
    company_id,
    voucher_type,
    quantity_change,
    voucher_id=None,
    voucher_number=None,
    unit_cost=Decimal('0.0000'),
    narration='',
    posting_date=None,
    created_by=None,
    batch_number=None
):
    """
    Authoritative single-point-of-truth stock ledger writer.
    Atomically calculates running balance_after and writes an immutable StockLedgerEntry.
    """
    if posting_date is None:
        posting_date = timezone.now()
    
    qty = Decimal(str(round(float(quantity_change), 4)))
    cost = Decimal(str(round(float(unit_cost or 0), 4)))
    
    try:
        # Calculate balance_after from previous entries for this product & warehouse
        latest_entry = StockLedgerEntry.objects.filter(
            productid_id=product_id,
            warehouseid_id=warehouse_id
        ).order_by('-posting_date', '-created_at', '-id').first()
        
        prev_balance = latest_entry.balance_after if latest_entry else Decimal('0.0000')
        new_balance = prev_balance + qty
        
        prefix = voucher_type[:6].lower() if voucher_type else 'txn'
        sle_id = f"sle_{prefix}_{uuid.uuid4().hex[:18]}"
        
        entry = StockLedgerEntry.objects.create(
            id=sle_id,
            companyid_id=company_id,
            warehouseid_id=warehouse_id,
            productid_id=product_id,
            posting_date=posting_date,
            voucher_type=voucher_type,
            voucher_id=str(voucher_id or ''),
            voucher_number=str(voucher_number or ''),
            batch_number=batch_number,
            quantity_change=qty,
            balance_after=new_balance,
            unit_cost=cost,
            narration=narration,
            created_by=created_by,
            created_at=timezone.now()
        )
        return entry
    except Exception as e:
        print(f"[LEDGER SERVICE] Warning: failed to record StockLedgerEntry: {e}")
        return None
