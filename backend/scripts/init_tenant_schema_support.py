import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def init_tenant_support():
    with connection.cursor() as cursor:
        print("1. Adding 'schemaName' column to 'Company' table...")
        cursor.execute('ALTER TABLE public."Company" ADD COLUMN IF NOT EXISTS "schemaName" text')

        print("2. Creating 'TenantUserMapping' table in public schema...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS public."TenantUserMapping" (
                email TEXT PRIMARY KEY,
                "companyId" TEXT NOT NULL,
                "schemaName" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "active" BOOLEAN NOT NULL DEFAULT TRUE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ''')

        print("3. Populating TenantUserMapping from existing users in public...")
        cursor.execute('''
            INSERT INTO public."TenantUserMapping" (email, "companyId", "schemaName", "role", "active", "createdAt")
            SELECT u.email, COALESCE(u."companyId", 'cmpwp1h8v0000sscdshw8thbl'), 'public', u.role, u.active, u."createdAt"
            FROM public."User" u
            WHERE u.role = 'SUPERADMIN'
            ON CONFLICT (email) DO NOTHING
        ''')
        cursor.execute('SELECT COUNT(*) FROM public."TenantUserMapping"')
        count = cursor.fetchone()[0]
        print(f"   -> TenantUserMapping ready with {count} registered accounts.")

if __name__ == '__main__':
    init_tenant_support()
