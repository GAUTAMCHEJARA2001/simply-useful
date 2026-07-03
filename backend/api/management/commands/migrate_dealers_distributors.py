"""
Migration command to move dealers and distributors from warehouse schemas to default DB.
Uses SET search_path to access each warehouse schema via the default connection.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Migrate dealers and distributors from warehouse schemas to default DB'

    def handle(self, *args, **options):
        from core.models import Warehouse

        self.stdout.write('Starting dealer/distributor migration to default DB...')
        warehouses = Warehouse.objects.using('default').filter(active=True)

        self.migrate_table(warehouses, 'Dealer', 'dealerCode')
        self.migrate_table(warehouses, 'Distributor', 'distributorCode')

        self.stdout.write(self.style.SUCCESS('Migration completed!'))

    def _get_columns(self, schema, table):
        with connection.cursor() as cur:
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = %s AND table_name = %s",
                [schema, table]
            )
            return {row[0] for row in cur.fetchall()}

    def _table_row_count(self, schema, table):
        try:
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO {schema}, public')
                cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cur.fetchone()[0]
                cur.execute('RESET search_path')
                return count
        except Exception:
            return 0

    def migrate_table(self, warehouses, table, code_col):
        self.stdout.write(f'Migrating {table}...')
        migrated = 0
        skipped = 0

        dst_cols = self._get_columns('public', table)
        if not dst_cols:
            self.stdout.write(self.style.WARNING(f'  {table} table does not exist in default DB. Run setup_warehouse_schema first.'))
            return

        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue

            src_cols = self._get_columns(alias, table)
            if not src_cols:
                self.stdout.write(f'  {alias}: no {table} columns found, skipping')
                continue

            row_count = self._table_row_count(alias, table)
            self.stdout.write(f'  {alias}: {row_count} rows, src_cols={len(src_cols)}, dst_cols={len(dst_cols)}')

            common_cols = sorted(src_cols & dst_cols)
            if not common_cols:
                self.stdout.write(self.style.WARNING(f'  {alias}: no common columns with default, skipping'))
                continue

            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO {alias}, public')
                col_list = ', '.join(f'"{c}"' for c in common_cols)
                cur.execute(f'SELECT {col_list} FROM "{table}"')
                rows = cur.fetchall()
                cur.execute('RESET search_path')

                for row in rows:
                    row_data = dict(zip(common_cols, row))
                    code_val = row_data.get(code_col.lower(), row_data.get(code_col))
                    name_val = row_data.get('distributorname', row_data.get('distributorName', row_data.get('dealername', row_data.get('dealerName', ''))))

                    if not code_val and not name_val:
                        skipped += 1
                        continue

                    with connection.cursor() as check_cur:
                        if code_val:
                            check_cur.execute(
                                f'SELECT 1 FROM "{table}" WHERE "{code_col}" = %s LIMIT 1',
                                [code_val]
                            )
                            if check_cur.fetchone():
                                skipped += 1
                                continue
                        elif name_val:
                            name_col = 'distributorName' if table == 'Distributor' else 'dealerName'
                            check_cur.execute(
                                f'SELECT 1 FROM "{table}" WHERE "{name_col}" = %s LIMIT 1',
                                [name_val]
                            )
                            if check_cur.fetchone():
                                skipped += 1
                                continue

                    placeholders = ', '.join(['%s'] * len(common_cols))
                    col_names = ', '.join(f'"{c}"' for c in common_cols)
                    values = list(row_data.values())

                    with connection.cursor() as ins_cur:
                        ins_cur.execute(
                            f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders})',
                            values
                        )
                        migrated += 1

        self.stdout.write(f'{table}: {migrated} migrated, {skipped} skipped')
