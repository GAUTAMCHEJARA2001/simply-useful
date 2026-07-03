"""
Migration command to move dealers and distributors from warehouse schemas to default DB.
Uses raw SQL to handle schemas that may not have warehouseId column yet.
"""
from django.core.management.base import BaseCommand
from django.db import connection, connections


class Command(BaseCommand):
    help = 'Migrate dealers and distributors from warehouse schemas to default DB'

    def handle(self, *args, **options):
        from core.models import Warehouse
        from api.db_router import setup_dynamic_tenant_databases

        self.stdout.write('Starting dealer/distributor migration to default DB...')
        setup_dynamic_tenant_databases()

        warehouses = Warehouse.objects.using('default').filter(active=True)

        self.migrate_table(warehouses, 'Dealer', 'dealerCode')
        self.migrate_table(warehouses, 'Distributor', 'distributorCode')

        self.stdout.write(self.style.SUCCESS('Migration completed!'))

    def _get_columns(self, schema, table):
        with connections[schema].cursor() as cur:
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = %s AND table_name = %s",
                [schema, table]
            )
            return {row[0] for row in cur.fetchall()}

    def _get_pk_columns(self, schema, table):
        with connections[schema].cursor() as cur:
            cur.execute(
                "SELECT a.attname FROM pg_index i "
                "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
                "WHERE i.indrelid = %s::regclass AND i.indisprimary",
                [f'{schema}.{table}']
            )
            return [row[0] for row in cur.fetchall()]

    def _table_row_count(self, schema, table):
        try:
            with connections[schema].cursor() as cur:
                cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                return cur.fetchone()[0]
        except Exception:
            return 0

    def migrate_table(self, warehouses, table, code_col):
        self.stdout.write(f'Migrating {table}...')
        migrated = 0
        skipped = 0

        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue

            src_cols = self._get_columns(alias, table)
            dst_cols = self._get_columns('default', table)

            if not src_cols:
                self.stdout.write(f'  {alias}: no {table} columns found, skipping')
                continue

            row_count = self._table_row_count(alias, table)
            self.stdout.write(f'  {alias}: {row_count} rows, src_cols={len(src_cols)}, dst_cols={len(dst_cols)}')

            common_cols = sorted(src_cols & dst_cols)
            if not common_cols:
                self.stdout.write(self.style.WARNING(f'  {alias}: no common columns with default, skipping'))
                continue

            col_list = ', '.join(f'"{c}"' for c in common_cols)

            with connections[alias].cursor() as src_cur:
                src_cur.execute(f'SELECT {col_list} FROM "{table}"')
                rows = src_cur.fetchall()

                for row in rows:
                    row_data = dict(zip(common_cols, row))
                    code_val = row_data.get(code_col.lower(), row_data.get(code_col))

                    if not code_val:
                        skipped += 1
                        continue

                    with connection.cursor() as dst_cur:
                        dst_cur.execute(
                            f'SELECT 1 FROM "{table}" WHERE "{code_col}" = %s LIMIT 1',
                            [code_val]
                        )
                        if dst_cur.fetchone():
                            skipped += 1
                            continue

                        placeholders = ', '.join(['%s'] * len(common_cols))
                        col_names = ', '.join(f'"{c}"' for c in common_cols)
                        values = list(row_data.values())

                        dst_cur.execute(
                            f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders})',
                            values
                        )
                        migrated += 1

        self.stdout.write(f'{table}: {migrated} migrated, {skipped} skipped')
