"""
Fix common database issues before migrate runs.
Adds missing columns, fixes broken table states.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix database schema issues before migrate'

    def handle(self, *args, **options):
        self.stdout.write('Fixing database schema...')

        fixes = [
            ('django_content_type', 'name', 'varchar(100)'),
        ]

        with connection.cursor() as cur:
            for table, column, col_type in fixes:
                try:
                    cur.execute(
                        "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                        "WHERE table_schema = 'public' AND table_name = %s AND column_name = %s)",
                        [table, column]
                    )
                    exists = cur.fetchone()[0]
                    if not exists:
                        cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}')
                        self.stdout.write(f'  Added {column} to {table}')
                    else:
                        self.stdout.write(f'  {table}.{column} OK')
                except Exception as e:
                    self.stdout.write(f'  Skipped {table}.{column}: {e}')

        self.stdout.write(self.style.SUCCESS('DB fix done'))
