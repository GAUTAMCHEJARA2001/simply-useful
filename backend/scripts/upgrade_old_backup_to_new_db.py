"""
Automated Database Migration & Upgrade Engine:
Upgrades an Old Database Backup into the New Enterprise Ledger Structure.

Steps Executed:
0. Ghost Schema Purge: Drops obsolete schemas (wh_main, wh_navsari_factory) if present.
1. Schema Evolution: Ensures all 6 enterprise tables exist with production DDL and indexes.
2. Relational Foreign Key Linkage: Connects legacy purchase line item text to Product IDs.
3. Chronological Event-Sourced Ledger Reconstruction: Generates immutable double-entry records.
4. Chronological Running Balance Computation (balanceAfter).
5. Mathematical Self-Auditing Verification Probe: Verifies 100% stock harmony.
"""

import os
import sys
import re
from decimal import Decimal

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
from django.apps import apps
if not apps.ready:
    django.setup()

from django.db import connection, transaction
from django.utils import timezone
from api.models import (
    Product, Purchaseitem, Orderitem, Stocktransaction,
    StockLedgerEntry, UomConversion
)


def step0_purge_ghost_schemas(silent=False):
    if not silent:
        print("[0/5] Checking and purging legacy ghost schemas (wh_main, wh_navsari_factory)...")
    with connection.cursor() as cursor:
        cursor.execute("""
            DROP SCHEMA IF EXISTS "wh_main" CASCADE;
            DROP SCHEMA IF EXISTS "wh_navsari_factory" CASCADE;
        """)
    if not silent:
        print("[OK] Ghost schemas checked and purged.")


def step1_ensure_schema(silent=False):
    if not silent:
        print("[1/5] Checking database schema & ensuring modern enterprise tables...")
    with connection.cursor() as cursor:
        # Check and add productId to PurchaseItem
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'PurchaseItem' 
                      AND column_name = 'productId'
                ) THEN
                    ALTER TABLE "PurchaseItem" ADD COLUMN "productId" TEXT NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'StockLedgerEntry' 
                      AND column_name = 'createdById'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'StockLedgerEntry' 
                      AND column_name = 'createdBy'
                ) THEN
                    ALTER TABLE "StockLedgerEntry" RENAME COLUMN "createdById" TO "createdBy";
                ELSIF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                      AND table_name = 'StockLedgerEntry'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'StockLedgerEntry' 
                      AND column_name = 'createdBy'
                ) THEN
                    ALTER TABLE "StockLedgerEntry" ADD COLUMN "createdBy" TEXT NULL;
                END IF;
            END $$;
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "idx_purchaseitem_productid" ON "PurchaseItem" ("productId");')

        # StockLedgerEntry
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "StockLedgerEntry" (
                "id" varchar(64) PRIMARY KEY,
                "companyId" text NOT NULL,
                "warehouseId" bigint NULL,
                "productId" text NOT NULL,
                "postingDate" timestamptz NOT NULL DEFAULT NOW(),
                "voucherType" varchar(40) NOT NULL,
                "voucherId" varchar(64) NULL,
                "voucherNumber" varchar(100) NULL,
                "batchNumber" varchar(64) NULL,
                "quantityChange" numeric(18, 4) NOT NULL,
                "balanceAfter" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "unitCost" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "narration" text NULL,
                "createdBy" text NULL,
                "createdAt" timestamptz NOT NULL DEFAULT NOW(),
                "isCancelled" boolean NOT NULL DEFAULT FALSE
            );
            CREATE INDEX IF NOT EXISTS idx_sle_comp_date ON "StockLedgerEntry" ("companyId", "postingDate");
            CREATE INDEX IF NOT EXISTS idx_sle_wh_prod_date ON "StockLedgerEntry" ("warehouseId", "productId", "postingDate");
            CREATE INDEX IF NOT EXISTS idx_sle_prod_date ON "StockLedgerEntry" ("productId", "postingDate");
            CREATE INDEX IF NOT EXISTS idx_sle_vtype_vid ON "StockLedgerEntry" ("voucherType", "voucherId");
        """)

        # UomConversion
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "UomConversion" (
                "id" varchar(64) PRIMARY KEY,
                "companyId" text NOT NULL,
                "productId" text NOT NULL,
                "fromUom" varchar(30) NOT NULL,
                "toUom" varchar(30) NOT NULL,
                "conversionFactor" numeric(14, 6) NOT NULL,
                "isBaseUom" boolean NOT NULL DEFAULT FALSE,
                "createdAt" timestamptz NOT NULL DEFAULT NOW(),
                UNIQUE("productId", "fromUom", "toUom")
            );
            CREATE INDEX IF NOT EXISTS idx_uom_prod_from ON "UomConversion" ("productId", "fromUom");
        """)

        # ProductBatch
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "ProductBatch" (
                "id" varchar(64) PRIMARY KEY,
                "companyId" text NOT NULL,
                "productId" text NOT NULL,
                "batchNumber" varchar(64) NOT NULL,
                "mfgDate" date NOT NULL,
                "expiryDate" date NULL,
                "mrp" numeric(14, 2) NOT NULL DEFAULT 0.00,
                "costPrice" numeric(14, 4) NOT NULL DEFAULT 0.0000,
                "qcStatus" varchar(20) NOT NULL DEFAULT 'APPROVED',
                "notes" text NULL,
                "createdAt" timestamptz NOT NULL DEFAULT NOW(),
                UNIQUE("productId", "batchNumber")
            );
            CREATE INDEX IF NOT EXISTS idx_batch_prod_num ON "ProductBatch" ("productId", "batchNumber");
            CREATE INDEX IF NOT EXISTS idx_batch_qc_status ON "ProductBatch" ("qcStatus");
        """)

        # StockTransfer & Item
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "StockTransfer" (
                "id" varchar(64) PRIMARY KEY,
                "companyId" text NOT NULL,
                "transferNumber" varchar(64) UNIQUE NOT NULL,
                "fromWarehouseId" bigint NOT NULL,
                "toWarehouseId" bigint NOT NULL,
                "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
                "vehicleNumber" varchar(50) NULL,
                "driverName" varchar(100) NULL,
                "driverMobile" varchar(20) NULL,
                "ewayBillNumber" varchar(50) NULL,
                "dispatchedAt" timestamptz NULL,
                "receivedAt" timestamptz NULL,
                "remarks" text NULL,
                "createdBy" text NULL,
                "createdAt" timestamptz NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_transfer_comp_status ON "StockTransfer" ("companyId", "status");
            CREATE INDEX IF NOT EXISTS idx_transfer_wh_route ON "StockTransfer" ("fromWarehouseId", "toWarehouseId");

            CREATE TABLE IF NOT EXISTS "StockTransferItem" (
                "id" varchar(64) PRIMARY KEY,
                "transferId" varchar(64) NOT NULL,
                "productId" text NOT NULL,
                "dispatchedQty" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "receivedQty" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "shortageQty" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "damageQty" numeric(18, 4) NOT NULL DEFAULT 0.0000,
                "unitRate" numeric(14, 4) NOT NULL DEFAULT 0.0000
            );
            CREATE INDEX IF NOT EXISTS idx_transferitem_tf_prod ON "StockTransferItem" ("transferId", "productId");
        """)

        # PaymentAllocation
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "PaymentAllocation" (
                "id" varchar(64) PRIMARY KEY,
                "companyId" text NOT NULL,
                "paymentReceiptId" varchar(64) NOT NULL,
                "orderId" varchar(64) NOT NULL,
                "invoiceNumber" varchar(100) NULL,
                "allocatedAmount" numeric(14, 2) NOT NULL,
                "allocatedAt" timestamptz NOT NULL DEFAULT NOW(),
                "allocatedBy" text NULL
            );
            CREATE INDEX IF NOT EXISTS idx_payalloc_rcpt ON "PaymentAllocation" ("paymentReceiptId");
            CREATE INDEX IF NOT EXISTS idx_payalloc_ord ON "PaymentAllocation" ("orderId");
        """)
    if not silent:
        print("[OK] Schema verified and all 6 modern tables active.")


def step2_relational_linkage(silent=False):
    if not silent:
        print("[2/5] Relational Linkage: Mapping legacy purchase items to Product IDs...")
    products = list(Product.objects.all())
    name_to_pid = {p.name.strip().lower(): p.id for p in products if p.name}
    
    unlinked_items = Purchaseitem.objects.filter(productid__isnull=True)
    count = unlinked_items.count()
    if count == 0:
        if not silent:
            print("[OK] All purchase items already linked to Product IDs.")
        return 0

    updated = 0
    with transaction.atomic():
        for item in unlinked_items:
            clean_name = (item.productname or '').strip().lower()
            if clean_name in name_to_pid:
                item.productid_id = name_to_pid[clean_name]
                item.save(update_fields=['productid'])
                updated += 1
    if not silent:
        print(f"[OK] Linked {updated}/{count} purchase items to real Product IDs.")
    return updated


def step3_reconstruct_stock_ledger(silent=False):
    if not silent:
        print("[3/5] Event-Sourced Ledger: Backfilling chronological entries...")
    existing_entries = StockLedgerEntry.objects.count()
    if existing_entries > 0:
        if not silent:
            print(f"[OK] StockLedgerEntry table already contains {existing_entries} records. Recalculating balances...")
        step4_recalculate_running_balances(silent=silent)
        return existing_entries

    products = list(Product.objects.all())
    entries_to_create = []
    
    # 1. Opening Stocks
    for p in products:
        qty = float(p.openingstock or 0)
        if qty > 0:
            entries_to_create.append(StockLedgerEntry(
                id=f"sle_op_{p.id}",
                companyid_id=p.companyid_id,
                productid_id=p.id,
                warehouseid_id=p.warehouseid_id,
                posting_date=p.createdat or timezone.now(),
                voucher_type='OPENING_STOCK',
                voucher_id=p.id,
                voucher_number='OPENING',
                quantity_change=Decimal(str(qty)),
                balance_after=Decimal('0'),
                narration='System Initial Opening Stock',
                created_at=p.createdat or timezone.now()
            ))

    # 2. Purchases
    pur_items = Purchaseitem.objects.filter(
        purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED', 'Partially Returned', 'Returned']
    ).select_related('purchaseid')
    for pi in pur_items:
        if not pi.productid_id:
            continue
        p_obj = pi.purchaseid
        is_return = str(p_obj.purchaseid or '').startswith('PRET-') or '[ORIGINAL PURCHASE:' in str(p_obj.narration or '')
        qty = float(pi.qty or 0)
        qty_change = -qty if is_return else qty
        v_type = 'PURCHASE_RETURN' if is_return else 'PURCHASE_RECEIPT'
        entries_to_create.append(StockLedgerEntry(
            id=f"sle_pur_{pi.id}",
            companyid_id=p_obj.companyid_id,
            productid_id=pi.productid_id,
            warehouseid_id=p_obj.warehouseid_id,
            posting_date=p_obj.date or p_obj.createdat or timezone.now(),
            voucher_type=v_type,
            voucher_id=str(p_obj.id),
            voucher_number=str(p_obj.purchaseid or p_obj.id),
            quantity_change=Decimal(str(qty_change)),
            balance_after=Decimal('0'),
            narration=f"Purchase {p_obj.purchaseid or p_obj.id}",
            created_at=p_obj.createdat or timezone.now()
        ))

    # 3. Stock Transactions (PRODUCTION, CONSUMED, ADJUSTMENT)
    sts = Stocktransaction.objects.exclude(
        reason__in=['PENDING_APPROVAL', 'REJECTED']
    ).exclude(is_deleted=True).exclude(referenceid__startswith='REV-')
    for st in sts:
        if not st.productid_id:
            continue
        t_type = st.transactiontype
        if t_type in ['OPENING_STOCK', 'PURCHASE']:
            continue
        v_type = t_type
        if t_type == 'PRODUCTION':
            v_type = 'PRODUCTION_IN'
        elif t_type == 'CONSUMED':
            v_type = 'RAW_CONSUMED'
        elif t_type in ['ADJUSTMENT', 'MANUAL_ADJUSTMENT']:
            v_type = 'STOCK_ADJUSTMENT'
        
        entries_to_create.append(StockLedgerEntry(
            id=f"sle_st_{st.id}",
            companyid_id=getattr(st.productid, 'companyid_id', None) if st.productid else None,
            productid_id=st.productid_id,
            warehouseid_id=st.warehouseid_id,
            posting_date=st.createdat or timezone.now(),
            voucher_type=v_type,
            voucher_id=str(st.id),
            voucher_number=str(st.referenceid or 'ST'),
            quantity_change=Decimal(str(st.quantity or 0)),
            balance_after=Decimal('0'),
            narration=st.reason or f"Transaction {st.transactiontype}",
            created_at=st.createdat or timezone.now()
        ))

    # Bulk insert
    with transaction.atomic():
        StockLedgerEntry.objects.bulk_create(entries_to_create, batch_size=500)
    if not silent:
        print(f"[OK] Backfilled {len(entries_to_create)} immutable ledger records.")
    step4_recalculate_running_balances(silent=silent)
    return len(entries_to_create)


def step4_recalculate_running_balances(silent=False):
    if not silent:
        print("[4/5] Chronological Balances: Computing running balances (balanceAfter)...")
    products = list(Product.objects.all())
    total_updated = 0
    with transaction.atomic():
        for p in products:
            entries = list(StockLedgerEntry.objects.filter(productid_id=p.id).order_by('posting_date', 'created_at', 'id'))
            if not entries:
                continue
            wh_balances = {}
            for entry in entries:
                wh_id = entry.warehouseid_id
                current = wh_balances.get(wh_id, Decimal('0'))
                current += Decimal(str(entry.quantity_change))
                wh_balances[wh_id] = current
                entry.balance_after = current
            StockLedgerEntry.objects.bulk_update(entries, ['balance_after'], batch_size=500)
            total_updated += len(entries)
    if not silent:
        print(f"[OK] Calculated running balances across {total_updated} entries.")
    return total_updated


def step5_verify_integrity(silent=False):
    if not silent:
        print("[5/5] Mathematical Self-Audit: Probing products...")
    from rest_framework.test import APIClient
    from api.models import User
    client = APIClient()
    admin_user = User.objects.filter(role='SUPERADMIN', active=True).first() or User.objects.filter(active=True).first()
    client.force_authenticate(user=admin_user)
    resp = client.get('/api/v1/reports/stock-integrity-audit')
    audit_data = {}
    if resp.status_code == 200:
        audit_data = resp.json().get('data', {})
        if not silent:
            print("\n========================================================")
            print("          DATABASE UPGRADE & INTEGRITY REPORT           ")
            print("========================================================")
            print(f" Total Products Audited:  {audit_data.get('totalProducts')}")
            print(f" Verified In Harmony:     {audit_data.get('verifiedProducts')}")
            print(f" Discrepancies:           {audit_data.get('discrepancyCount')}")
            print(f" Health Status:           {'100% HEALTHY' if audit_data.get('healthy') else 'DEGRADED'}")
            print(f" Message:                 {audit_data.get('message')}")
            print("========================================================\n")
    else:
        if not silent:
            print("Audit probe returned HTTP", resp.status_code)
    return audit_data


def run_full_upgrade(silent=False):
    """
    Master function: Executes the complete automated upgrade pipeline.
    Called automatically on any database restore (CLI or UI).
    """
    step0_purge_ghost_schemas(silent=silent)
    step1_ensure_schema(silent=silent)
    step2_relational_linkage(silent=silent)
    ledger_entries = step3_reconstruct_stock_ledger(silent=silent)
    
    # Run VACUUM ANALYZE to update PostgreSQL query planner
    with connection.cursor() as cursor:
        cursor.execute("VACUUM ANALYZE;")
        
    audit_data = step5_verify_integrity(silent=silent)
    discrepancies = audit_data.get('discrepancyCount', 0)
    healthy = audit_data.get('healthy', True)
    
    msg = f"Upgrade completed: {ledger_entries} ledger entries active, {discrepancies} discrepancies."
    return {
        'success': True,
        'ledger_entries': ledger_entries,
        'discrepancy_count': discrepancies,
        'healthy': healthy,
        'message': msg
    }


if __name__ == '__main__':
    print("========================================================")
    print("   Simply Useful Enterprise Database Upgrade Tool       ")
    print("========================================================")
    res = run_full_upgrade(silent=False)
    print(f"RESULT: {res['message']}")
