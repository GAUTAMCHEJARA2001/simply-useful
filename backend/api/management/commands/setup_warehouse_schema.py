"""
Setup:
1. Creates Dealer/Distributor tables in default (public) schema
2. Adds warehouseId column to Dealer/Distributor in each warehouse schema
3. Adds performance indexes in each warehouse schema
"""
from django.core.management.base import BaseCommand
from django.db import connection, connections
from core.models import Warehouse


class Command(BaseCommand):
    help = 'Setup default tables + warehouse schema columns and indexes'

    def _table_exists(self, table_name, schema='public'):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s)",
                [schema, table_name]
            )
            return cursor.fetchone()[0]

    def _column_exists(self, table_name, column_name, schema='public'):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = %s AND table_name = %s AND column_name = %s)",
                [schema, table_name, column_name]
            )
            return cursor.fetchone()[0]

    def handle(self, *args, **options):
        from api.db_router import setup_dynamic_tenant_databases
        setup_dynamic_tenant_databases()

        self._create_default_tables()
        self._setup_warehouse_schemas()
        self.stdout.write(self.style.SUCCESS('Done!'))

    def _create_default_tables(self):
        self.stdout.write('Creating Dealer table in default DB...')
        if self._table_exists('Dealer'):
            self.stdout.write('  Dealer table already exists')
        else:
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE "Dealer" (
                        "id" text PRIMARY KEY,
                        "dealerCode" text NOT NULL,
                        "dealerName" text NOT NULL,
                        "city" text NOT NULL DEFAULT '',
                        "assignedSoEmail" text NOT NULL DEFAULT '',
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
                    )
                """)
            self.stdout.write('  Dealer table created')

        self.stdout.write('Creating Distributor table in default DB...')
        if self._table_exists('Distributor'):
            self.stdout.write('  Distributor table already exists')
        else:
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE "Distributor" (
                        "id" text PRIMARY KEY,
                        "distributorCode" text UNIQUE,
                        "distributorName" text NOT NULL,
                        "area" text NOT NULL DEFAULT '',
                        "assignedSoEmail" text NOT NULL DEFAULT '',
                        "creditLimit" numeric(14,2) DEFAULT 0.00,
                        "outstanding" numeric(14,2) DEFAULT 0.00,
                        "active" boolean NOT NULL DEFAULT true,
                        "territory" text,
                        "companyId" text REFERENCES "Company"("id"),
                        "createdAt" timestamptz DEFAULT now(),
                        "updatedAt" timestamptz DEFAULT now(),
                        "warehouseId" integer REFERENCES "Warehouse"("id")
                    )
                """)
            self.stdout.write('  Distributor table created')

        for col in ['warehouseId']:
            if not self._column_exists('Dealer', col):
                with connection.cursor() as cursor:
                    cursor.execute(f'ALTER TABLE "Dealer" ADD COLUMN "{col}" integer REFERENCES "Warehouse"("id")')
                self.stdout.write(f'  Added {col} to Dealer (default)')

        for col in ['warehouseId']:
            if not self._column_exists('Distributor', col):
                with connection.cursor() as cursor:
                    cursor.execute(f'ALTER TABLE "Distributor" ADD COLUMN "{col}" integer REFERENCES "Warehouse"("id")')
                self.stdout.write(f'  Added {col} to Distributor (default)')

    def _setup_warehouse_schemas(self):
        self.stdout.write('Setting up warehouse schemas...')

        warehouses = Warehouse.objects.using('default').filter(active=True)

        columns_to_add = {
            'Dealer': ['warehouseId'],
            'Distributor': ['warehouseId'],
        }

        indexes = [
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

        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue

            self.stdout.write(f'Processing {wh.name} (schema: {alias})...')

            try:
                with connections[alias].cursor() as cur:
                    for table, cols in columns_to_add.items():
                        for col in cols:
                            try:
                                cur.execute(
                                    "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                                    "WHERE table_schema = %s AND table_name = %s AND column_name = %s)",
                                    [alias, table, col]
                                )
                                exists = cur.fetchone()[0]
                                if not exists:
                                    cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "{col}" integer')
                                    self.stdout.write(f'  Added {col} to {table}')
                            except Exception as e:
                                self.stdout.write(f'  {table}.{col}: {e}')

                    created = 0
                    for idx_name, table, column in indexes:
                        try:
                            cur.execute(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column})')
                            created += 1
                        except Exception:
                            pass
                    self.stdout.write(f'  {created} indexes created')

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Error connecting to {alias}: {e}'))
