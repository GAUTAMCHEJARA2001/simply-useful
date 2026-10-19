"""
Management command to synchronize database schemas, tables, columns, and indexes
across all multi-tenant company schemas.

Usage:
    python manage.py migrate_all_tenants
    python manage.py migrate_all_tenants --tenant=tenant_apex_12345
"""
import re
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from core.models import Company
from api.tenant_manager import SHARED_PUBLIC_TABLES, logger


class Command(BaseCommand):
    help = 'Synchronize all operational tables, missing columns, and indexes across all tenant schemas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            default=None,
            help='Specify a single tenant schema name to migrate (default: all active tenants)'
        )

    def handle(self, *args, **options):
        single_tenant = options.get('tenant')

        self.stdout.write(self.style.MIGRATE_HEADING("=== Multi-Tenant Schema Synchronization ==="))

        # 1. Fetch public tables
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_type = 'BASE TABLE'
            """)
            public_tables = [r[0] for r in cursor.fetchall() if r[0] not in SHARED_PUBLIC_TABLES]

        self.stdout.write(f"Operational tables discovered in public: {len(public_tables)}")

        # 2. Fetch target tenant schemas
        qs = Company.objects.filter(schemaname__isnull=False).exclude(schemaname__in=['public', ''])
        if single_tenant:
            qs = qs.filter(schemaname=single_tenant)

        tenants = list(qs)
        if not tenants:
            self.stdout.write(self.style.WARNING("No matching tenant organizations with dedicated schemas found to migrate."))
            return

        self.stdout.write(f"Target tenant organizations to synchronize: {len(tenants)}\n")

        total_cloned_tables = 0
        total_synced_cols = 0

        for company in tenants:
            schema = company.schemaname
            self.stdout.write(self.style.NOTICE(f"--> Syncing tenant '{company.name}' (schema: {schema})..."))

            if not schema or not isinstance(schema, str) or not re.match(r'^[a-z0-9_]+$', schema):
                self.stdout.write(self.style.ERROR(f"    Invalid schema identifier '{schema}', skipping."))
                continue

            with connection.cursor() as cursor:
                # Ensure schema exists
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')

                # Fetch existing tables in this schema
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                      AND table_type = 'BASE TABLE'
                """, [schema])
                existing_tables = set(r[0] for r in cursor.fetchall())

                # Clone missing tables
                cloned_count = 0
                for table in public_tables:
                    if table not in existing_tables:
                        try:
                            with transaction.atomic():
                                cursor.execute(f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (LIKE public."{table}" INCLUDING ALL)')
                            cloned_count += 1
                            total_cloned_tables += 1
                        except Exception as err:
                            self.stdout.write(self.style.WARNING(f"    Failed cloning table {table}: {err}"))

                if cloned_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"    Cloned {cloned_count} new table(s)"))

                # Synchronize missing columns on existing tables
                col_sync_count = 0
                for table in public_tables:
                    if table in existing_tables:
                        # Fetch columns in public vs tenant
                        cursor.execute("""
                            SELECT column_name, data_type, udt_name, is_nullable, column_default
                            FROM information_schema.columns 
                            WHERE table_schema = 'public' AND table_name = %s
                        """, [table])
                        public_cols = {r[0]: r for r in cursor.fetchall()}

                        cursor.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_schema = %s AND table_name = %s
                        """, [schema, table])
                        tenant_cols = set(r[0] for r in cursor.fetchall())

                        for col_name, col_meta in public_cols.items():
                            if col_name not in tenant_cols:
                                data_type = col_meta[2]  # udt_name handles text, varchar, timestamptz, etc.
                                is_nullable = col_meta[3]
                                col_default = col_meta[4]

                                null_clause = "" if is_nullable == 'YES' else "NOT NULL"
                                default_clause = f"DEFAULT {col_default}" if col_default else ""

                                try:
                                    with transaction.atomic():
                                        cursor.execute(f'ALTER TABLE "{schema}"."{table}" ADD COLUMN "{col_name}" {data_type} {default_clause}')
                                    col_sync_count += 1
                                    total_synced_cols += 1
                                    self.stdout.write(f"    Added missing column {table}.{col_name} ({data_type})")
                                except Exception as col_err:
                                    self.stdout.write(self.style.WARNING(f"    Failed adding {table}.{col_name}: {col_err}"))

                if col_sync_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"    Synced {col_sync_count} missing column(s)"))

        self.stdout.write(self.style.SUCCESS(
            f"\n=== Migration Complete: {len(tenants)} tenant schemas verified. "
            f"Cloned {total_cloned_tables} missing tables, synchronized {total_synced_cols} missing columns. ==="
        ))
