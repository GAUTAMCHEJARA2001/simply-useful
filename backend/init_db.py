import os
import django
import uuid
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Company, Warehouse, Domain, User
from django.db import connection

def initialize():
    print("🚀 Initializing PostgreSQL single-database tenant schemas...")
    now = timezone.now()
    
    # 1. Create Company
    company_id = 'cmo75yliq0000wesurjpett1n'
    company, created = Company.objects.get_or_create(
        id=company_id,
        defaults={
            'name': 'Simply Useful',
            'skuprefix': 'SMPL',
            'active': True,
            'stockmethod': 'FIFO',
            'createdat': now,
            'updatedat': now
        }
    )
    if created:
        print(f"🏢 Created Company: {company.name}")
    else:
        print(f"🏢 Company already exists: {company.name}")

    # 2. Create Warehouse (Tenant) - NAVSARI
    wh_navsari, created = Warehouse.objects.get_or_create(
        schema_name='wh_navsari',
        defaults={
            'name': 'NAVSARI',
            'active': True,
            'companyid': company,
            'location': 'Navsari Warehouse',
            'db_name': 'wh_navsari',
            'db_host': 'localhost',
            'db_port': 5432
        }
    )
    if created:
        print("🏗️ Created Tenant Warehouse: NAVSARI (schema: wh_navsari)")
        # Create Domain for NAVSARI
        Domain.objects.create(
            domain='navsari.localhost',
            tenant=wh_navsari,
            is_primary=True
        )
        print("🔗 Associated Domain: navsari.localhost")
    else:
        print("🏗️ Tenant Warehouse NAVSARI already exists")

    # 3. Create Warehouse (Tenant) - NASHIK
    wh_nashik, created = Warehouse.objects.get_or_create(
        schema_name='wh_nashik',
        defaults={
            'name': 'NASHIK',
            'active': True,
            'companyid': company,
            'location': 'Nashik Warehouse',
            'db_name': 'wh_nashik',
            'db_host': 'localhost',
            'db_port': 5432
        }
    )
    if created:
        print("🏗️ Created Tenant Warehouse: NASHIK (schema: wh_nashik)")
        # Create Domain for NASHIK
        Domain.objects.create(
            domain='nashik.localhost',
            tenant=wh_nashik,
            is_primary=True
        )
        print("🔗 Associated Domain: nashik.localhost")
    else:
        print("🏗️ Tenant Warehouse NASHIK already exists")

    print("🏁 Initial schema setup complete!")

if __name__ == '__main__':
    initialize()
