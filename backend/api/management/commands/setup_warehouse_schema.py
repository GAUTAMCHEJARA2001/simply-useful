"""
Setup warehouse databases: add warehouseId columns and performance indexes.
Run after deployment: python manage.py setup_warehouse_schema
"""
from django.core.management.base import BaseCommand
from django.db import connection
from core.models import Warehouse


SCHEMA_CHANGES = [
    # Add warehouseId to Dealer if not exists
    """DO $$ BEGIN
        ALTER TABLE "Dealer" ADD COLUMN "warehouseId" integer NULL;
    EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL;
    END $$;""",
    
    # Add warehouseId to Distributor if not exists  
    """DO $$ BEGIN
        ALTER TABLE "Distributor" ADD COLUMN "warehouseId" integer NULL;
    EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL;
    END $$;""",
]

INDEXES = [
    ("idx_dealer_company", "Dealer", "companyId"),
    ("idx_dealer_warehouse", "Dealer", "warehouseId"),
    ("idx_dealer_name", "Dealer", "dealerName"),
    ("idx_dealer_so", "Dealer", "assignedSoEmail"),
    ("idx_distributor_company", "Distributor", "companyId"),
    ("idx_distributor_warehouse", "Distributor", "warehouseId"),
    ("idx_distributor_name", "Distributor", "distributorName"),
    ("idx_order_status", '"Order"', "status"),
    ("idx_order_date", '"Order"', "date"),
    ("idx_order_company", '"Order"', "companyId"),
    ("idx_order_so", '"Order"', "soEmail"),
    ("idx_orderitem_order", "OrderItem", "orderId"),
    ("idx_orderitem_product", "OrderItem", "productId"),
    ("idx_product_company", "Product", "companyId"),
    ("idx_product_code", "Product", "productCode"),
    ("idx_product_category", "Product", "categoryId"),
    ("idx_purchaseitem_product", "PurchaseItem", "productName"),
    ("idx_stocktxn_product", "StockTransaction", "productId"),
    ("idx_stocktxn_reason", "StockTransaction", "reason"),
]


class Command(BaseCommand):
    help = 'Setup warehouse schema: add columns and indexes'

    def handle(self, *args, **options):
        self.stdout.write('Setting up warehouse schemas...')
        
        warehouses = Warehouse.objects.using('default').filter(active=True)
        
        for wh in warehouses:
            if not wh.db_name:
                continue
            
            self.stdout.write(f'Processing {wh.name}...')
            
            # Run schema changes (atomic=False needed for DO blocks)
            for sql in SCHEMA_CHANGES:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(sql)
                except Exception as e:
                    self.stdout.write(f'  Schema change skipped: {e}')
            
            # Add indexes
            created = 0
            for idx_name, table, column in INDEXES:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column});"
                        )
                        created += 1
                except Exception:
                    pass
            
            self.stdout.write(f'  {created} indexes created')
        
        self.stdout.write(self.style.SUCCESS('Done!'))
