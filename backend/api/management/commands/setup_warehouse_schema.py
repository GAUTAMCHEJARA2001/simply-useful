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


DEFAULT_TABLES_SQL = [
    """DO $$ BEGIN
        CREATE TABLE IF NOT EXISTS "Dealer" (
            "id" text PRIMARY KEY,
            "dealerCode" text NOT NULL,
            "dealerName" text NOT NULL,
            "city" text NOT NULL,
            "assignedSoEmail" text NOT NULL,
            "distributorName" text,
            "creditLimit" numeric(14,2) DEFAULT 0.00,
            "outstanding" numeric(14,2) DEFAULT 0.00,
            "active" boolean NOT NULL DEFAULT true,
            "territory" text,
            "companyId" text REFERENCES "Company"("id"),
            "createdAt" timestamptz DEFAULT now(),
            "updatedAt" timestamptz DEFAULT now(),
            "convertedLeadId" text,
            "warehouseId" integer REFERENCES "Warehouse"("id")
        );
    EXCEPTION WHEN duplicate_table THEN NULL;
    END $$;""",
    """DO $$ BEGIN
        CREATE TABLE IF NOT EXISTS "Distributor" (
            "id" text PRIMARY KEY,
            "distributorCode" text UNIQUE,
            "distributorName" text NOT NULL,
            "area" text NOT NULL,
            "assignedSoEmail" text NOT NULL,
            "creditLimit" numeric(14,2) DEFAULT 0.00,
            "outstanding" numeric(14,2) DEFAULT 0.00,
            "active" boolean NOT NULL DEFAULT true,
            "territory" text,
            "companyId" text REFERENCES "Company"("id"),
            "createdAt" timestamptz DEFAULT now(),
            "updatedAt" timestamptz DEFAULT now(),
            "warehouseId" integer REFERENCES "Warehouse"("id")
        );
    EXCEPTION WHEN duplicate_table THEN NULL;
    END $$;""",
]


class Command(BaseCommand):
    help = 'Setup warehouse schema: create tables in default DB and add columns/indexes'

    def handle(self, *args, **options):
        self.stdout.write('Creating Dealer/Distributor tables in default DB if missing...')
        for sql in DEFAULT_TABLES_SQL:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
            except Exception as e:
                self.stdout.write(f'  Table creation: {e}')

        self.stdout.write('Setting up warehouse schemas...')
        
        warehouses = Warehouse.objects.using('default').filter(active=True)
        
        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue
            
            self.stdout.write(f'Processing {wh.name}...')
            
            for sql in SCHEMA_CHANGES:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(sql)
                except Exception as e:
                    self.stdout.write(f'  Schema change skipped: {e}')
            
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
