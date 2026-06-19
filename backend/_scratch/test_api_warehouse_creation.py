import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from rest_framework.test import APIClient
from api.models import User
from core.models import Warehouse, Domain
from api.auth import generate_tokens
from django.db import connection

def run_test():
    print("🚀 Running API Warehouse Creation Test...")
    
    # 1. Fetch Admin User
    u = User.objects.using('default').filter(role='SUPERADMIN').first()
    if not u:
        # If no superadmin user exists, create a default test admin in default DB
        from core.models import Company
        company, _ = Company.objects.get_or_create(
            id='cmo75yliq0000wesurjpett1n', 
            defaults={'name': 'Simply Useful', 'active': True, 'stockmethod': 'FIFO'}
        )
        u, _ = User.objects.using('default').get_or_create(
            email='admin@alpha.com',
            defaults={
                'id': 'superadmin-1',
                'name': 'System Admin',
                'role': 'SUPERADMIN',
                'hashedpassword': 'mocked_password_hash',
                'active': True,
                'companyid': company
            }
        )

    client = APIClient()
    token, _ = generate_tokens(str(u.id), u.email, u.role, u.companyid_id)
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

    # 2. Call POST /api/v1/masters/warehouses
    # Since we deleted NAVSARI, let's create it via the API
    payload = {
        "name": "NAVSARI",
        "location": "Navsari Warehouse",
        "schema_name": "wh_navsari",
        "db_name": "wh_navsari",
        "active": True
    }
    
    print("🏗️ Sending POST to /api/v1/masters/warehouses...")
    resp = client.post('/api/v1/masters/warehouses', payload, format='json')
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.json()}")
    assert resp.status_code == 201

    # 3. Check Domain
    wh_id = resp.json().get('data', {}).get('id')
    wh_obj = Warehouse.objects.using('default').get(id=wh_id)
    domain_exists = Domain.objects.using('default').filter(tenant=wh_obj).exists()
    print(f"📊 Auto-registered Domain exists: {domain_exists}")
    assert domain_exists

    # 4. Check if schema exists in PostgreSQL
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name='wh_navsari'")
        schema_exists = cursor.fetchone() is not None
    print(f"📊 Schema 'wh_navsari' created successfully: {schema_exists}")
    assert schema_exists

    # 5. Check GET /api/v1/masters/warehouses
    print("🔍 Sending GET to /api/v1/masters/warehouses...")
    resp_get = client.get('/api/v1/masters/warehouses')
    print(f"Status Code: {resp_get.status_code}")
    print(f"Response data: {resp_get.json().get('data')}")
    assert resp_get.status_code == 200

    print("\n🎉 SUCCESS: Warehouse registered successfully via API, domain auto-created, and schema migrated! 🎉")

if __name__ == '__main__':
    run_test()
