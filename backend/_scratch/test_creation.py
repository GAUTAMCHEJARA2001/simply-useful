import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Warehouse, Domain
from django.db import connection
from core.models import Company

def test_creation():
    print("🚀 Running Warehouse Creation Integration Test...")
    
    # 1. Ensure company exists
    company, _ = Company.objects.get_or_create(
        id='cmo75yliq0000wesurjpett1n', 
        defaults={'name': 'Simply Useful', 'active': True, 'stockmethod': 'FIFO'}
    )

    # 2. Create Warehouse
    schema_name = 'wh_test_integration'
    print(f"🏗️ Creating Warehouse: {schema_name}...")
    wh = Warehouse.objects.create(
        schema_name=schema_name,
        name='TEST_INTEGRATION_WH',
        active=True,
        companyid=company,
        location='Integration Location',
        db_name=schema_name
    )

    # 3. Create Domain
    print("🔗 Creating associated domain...")
    Domain.objects.create(
        domain='testintegration.localhost',
        tenant=wh,
        is_primary=True
    )

    # 4. Check if schema was created in PostgreSQL
    print("🔍 Querying database catalog for schema existence...")
    schema_exists = False
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name=%s", [schema_name])
        result = cursor.fetchone()
        schema_exists = result is not None
    
    print(f"📊 Schema '{schema_name}' exists in DB: {schema_exists}")
    
    # 5. Check if tenant tables (like Product) exist in the new schema
    tables_exist = False
    if schema_exists:
        with connection.cursor() as cursor:
            # Switch search path to the test schema
            cursor.execute(f"SET search_path TO {schema_name}")
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name='Product'", [schema_name])
            result = cursor.fetchone()
            tables_exist = result is not None
            # Reset search path
            cursor.execute("SET search_path TO public")

    print(f"📊 Table 'Product' migrated in new schema: {tables_exist}")

    # 6. Cleanup (Delete warehouse and verify schema is dropped)
    print("🧹 Cleaning up (deleting test domain and warehouse)...")
    Domain.objects.filter(tenant=wh).delete()
    wh.delete()

    schema_exists_after = True
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name=%s", [schema_name])
        result = cursor.fetchone()
        schema_exists_after = result is not None
    
    print(f"📊 Schema '{schema_name}' exists in DB (after deletion): {schema_exists_after}")

    if schema_exists and tables_exist and not schema_exists_after:
        print("\n🎉 SUCCESS: New warehouse creates schema, runs migrations, and deletes cleanly! 🎉")
    else:
        print("\n❌ FAILURE: Warehouse lifecycle check failed.")

if __name__ == '__main__':
    test_creation()
