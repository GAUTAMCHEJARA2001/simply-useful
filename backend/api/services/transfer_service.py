from decimal import Decimal
from django.utils import timezone
from django.db import transaction
import uuid
from api.models import StockTransfer, StockTransferItem, Product
from api.services.ledger_service import record_stock_ledger_entry

def create_stock_transfer(company_id, from_wh_id, to_wh_id, items, vehicle_number='', driver_name='', driver_mobile='', eway_bill='', remarks='', created_by=None):
    """
    Creates a new stock transfer draft.
    items = [{'productId': ..., 'qty': ..., 'rate': ...}, ...]
    """
    if from_wh_id == to_wh_id:
        raise ValueError("Source warehouse and destination warehouse cannot be the same.")

    tf_id = f"tf_{uuid.uuid4().hex[:20]}"
    tf_num = f"TRF-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    with transaction.atomic():
        transfer = StockTransfer.objects.create(
            id=tf_id,
            companyid_id=company_id,
            transfer_number=tf_num,
            from_warehouse_id=from_wh_id,
            to_warehouse_id=to_wh_id,
            status='DRAFT',
            vehicle_number=vehicle_number,
            driver_name=driver_name,
            driver_mobile=driver_mobile,
            eway_bill_number=eway_bill,
            remarks=remarks,
            created_by=created_by,
            created_at=timezone.now()
        )

        item_objs = []
        for it in items:
            p_id = it.get('productId') or it.get('product_id')
            qty = Decimal(str(round(float(it.get('qty') or it.get('quantity') or 0), 4)))
            rate = Decimal(str(round(float(it.get('rate') or it.get('unitRate') or 0), 4)))
            if p_id and qty > 0:
                item_objs.append(StockTransferItem(
                    id=f"tfi_{uuid.uuid4().hex[:20]}",
                    transfer=transfer,
                    product_id=p_id,
                    dispatched_qty=qty,
                    received_qty=Decimal('0.0000'),
                    shortage_qty=Decimal('0.0000'),
                    damage_qty=Decimal('0.0000'),
                    unit_rate=rate
                ))
        if item_objs:
            StockTransferItem.objects.bulk_create(item_objs)

    return transfer

def dispatch_stock_transfer(transfer_id, user=None):
    """
    Dispatches transfer from source warehouse.
    Deducts stock from from_warehouse and logs StockLedgerEntry.
    """
    with transaction.atomic():
        transfer = StockTransfer.objects.select_for_update().get(id=transfer_id)
        if transfer.status != 'DRAFT':
            raise ValueError(f"Transfer #{transfer.transfer_number} is already {transfer.status}.")

        items = transfer.items.select_related('product').all()
        # Concurrency lock on products
        p_ids = [it.product_id for it in items]
        list(Product.objects.select_for_update().filter(id__in=p_ids))

        for it in items:
            record_stock_ledger_entry(
                product_id=it.product_id,
                warehouse_id=transfer.from_warehouse_id,
                company_id=transfer.companyid_id,
                voucher_type='TRANSFER_OUT',
                quantity_change=-it.dispatched_qty,
                voucher_id=transfer.id,
                voucher_number=transfer.transfer_number,
                unit_cost=it.unit_rate,
                narration=f"Transferred to WH #{transfer.to_warehouse_id} (Vehicle: {transfer.vehicle_number or '-'})",
                posting_date=timezone.now(),
                created_by=user
            )

        transfer.status = 'DISPATCHED'
        transfer.dispatched_at = timezone.now()
        transfer.save(update_fields=['status', 'dispatched_at'])

    return transfer

def receive_stock_transfer(transfer_id, received_items=None, user=None):
    """
    Receives transfer at destination warehouse.
    Credits received_qty to to_warehouse and logs StockLedgerEntry.
    received_items = {item_id: {'receivedQty': ..., 'shortageQty': ..., 'damageQty': ...}}
    """
    with transaction.atomic():
        transfer = StockTransfer.objects.select_for_update().get(id=transfer_id)
        if transfer.status != 'DISPATCHED':
            raise ValueError(f"Cannot receive transfer in {transfer.status} status.")

        items = transfer.items.select_related('product').all()
        for it in items:
            rec_data = (received_items or {}).get(it.id, {})
            rec_qty = Decimal(str(round(float(rec_data.get('receivedQty', it.dispatched_qty)), 4)))
            short_qty = Decimal(str(round(float(rec_data.get('shortageQty', 0)), 4)))
            dam_qty = Decimal(str(round(float(rec_data.get('damageQty', 0)), 4)))

            it.received_qty = rec_qty
            it.shortage_qty = short_qty
            it.damage_qty = dam_qty
            it.save(update_fields=['received_qty', 'shortage_qty', 'damage_qty'])

            if rec_qty > 0:
                record_stock_ledger_entry(
                    product_id=it.product_id,
                    warehouse_id=transfer.to_warehouse_id,
                    company_id=transfer.companyid_id,
                    voucher_type='TRANSFER_IN',
                    quantity_change=rec_qty,
                    voucher_id=transfer.id,
                    voucher_number=transfer.transfer_number,
                    unit_cost=it.unit_rate,
                    narration=f"Received from WH #{transfer.from_warehouse_id}",
                    posting_date=timezone.now(),
                    created_by=user
                )

        transfer.status = 'RECEIVED'
        transfer.received_at = timezone.now()
        transfer.save(update_fields=['status', 'received_at'])

    return transfer
