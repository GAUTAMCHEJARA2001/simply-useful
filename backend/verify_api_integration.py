import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from rest_framework.test import APIClient
from api.models import User, Category, Warehouse
from api.auth import generate_tokens

def run_tests():
    print("🧪 Starting Endpoint Integrity Verification (GET, POST, CRUD, Isolation)...")

    # 1. Fetch Admin User
    u = User.objects.using('default').filter(role='SUPERADMIN').first()
    if not u:
        print("❌ Error: No SUPERADMIN user found to run test client.")
        return
    
    # Ensure test warehouses exist
    from core.models import Company
    company, _ = Company.objects.using('default').get_or_create(
        id=u.companyid_id,
        defaults={'name': 'Simply Useful', 'active': True, 'stockmethod': 'FIFO'}
    )
    Warehouse.objects.using('default').get_or_create(
        schema_name='wh_nashik',
        defaults={
            'name': 'Nashik Test',
            'active': True,
            'companyid': company,
            'db_name': 'wh_nashik'
        }
    )
    Warehouse.objects.using('default').get_or_create(
        schema_name='wh_navsari',
        defaults={
            'name': 'Navsari Test',
            'active': True,
            'companyid': company,
            'db_name': 'wh_navsari'
        }
    )
    # Re-register connections dynamically for test databases
    from api.db_router import setup_dynamic_tenant_databases
    setup_dynamic_tenant_databases()
    
    print(f"👤 Testing as user: {u.email} ({u.role})")
    
    # 2. Initialize API Test Client
    client = APIClient()
    token, _ = generate_tokens(str(u.id), u.email, u.role, u.companyid_id)
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

    # 3. GET /masters/warehouses (Global context, no header)
    print("\n--- 1. Testing GET on Global Endpoint (Warehouses List) ---")
    resp = client.get('/api/v1/masters/warehouses')
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")
    assert resp.status_code == 200, "Global warehouse fetch failed"

    # 4. Multi-Tenant Isolation Check (Categories GET count)
    print("\n--- 2. Testing GET Categories across Tenant Schemas ---")
    # Nashik Categories
    resp_nashik = client.get('/api/v1/masters/categories', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"Nashik GET Categories Status: {resp_nashik.status_code}")
    nashik_cnt = len(resp_nashik.json().get('data', []))
    print(f"Nashik Category Count: {nashik_cnt}")
    assert resp_nashik.status_code == 200

    # Navsari Categories
    resp_navsari = client.get('/api/v1/masters/categories', HTTP_X_WAREHOUSE_ID='wh_navsari')
    print(f"Navsari GET Categories Status: {resp_navsari.status_code}")
    navsari_cnt = len(resp_navsari.json().get('data', []))
    print(f"Navsari Category Count: {navsari_cnt}")
    assert resp_navsari.status_code == 200

    # 5. CRUD Operation (POST, GET, PATCH, DELETE) under wh_nashik schema
    print("\n--- 3. Testing CRUD operations on 'wh_nashik' ---")
    
    # POST (Create Category)
    payload = {"name": "QA-Test-Category", "active": True}
    resp_create = client.post('/api/v1/masters/categories', payload, format='json', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"POST Category Status: {resp_create.status_code}")
    create_data = resp_create.json()
    print(f"POST Category Response: {create_data}")
    assert resp_create.status_code == 201
    
    cat_id = create_data.get('data', {}).get('id')
    assert cat_id is not None, "Category ID was not returned in creation response."
    print(f"✅ Created Category ID: {cat_id}")

    # Isolation check: Retrieve Category under Navsari schema to ensure it does NOT exist there
    resp_navsari_check = client.get(f'/api/v1/masters/categories/{cat_id}', HTTP_X_WAREHOUSE_ID='wh_navsari')
    print(f"GET Category in 'wh_navsari' Status: {resp_navsari_check.status_code} (Should be 404)")
    assert resp_navsari_check.status_code == 404, "Isolation violation! Created item in Nashik is visible in Navsari."
    print("✅ Schema Isolation Verified: Nashik item is completely invisible to Navsari.")

    # PATCH (Update Category name)
    patch_payload = {"name": "QA-Test-Category-Updated", "active": True}
    resp_update = client.patch(f'/api/v1/masters/categories/{cat_id}', patch_payload, format='json', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"PATCH Category Status: {resp_update.status_code}")
    update_json = resp_update.json()
    print(f"PATCH Category Response: {update_json}")
    assert resp_update.status_code == 200
    updated_name = update_json.get('data', {}).get('name') if 'data' in update_json else update_json.get('name')
    assert updated_name == "QA-Test-Category-Updated"
    print("✅ Update verified successfully.")

    # GET Single Item (Retrieve Category under Nashik schema)
    resp_get_one = client.get(f'/api/v1/masters/categories/{cat_id}', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"GET Single Category Status: {resp_get_one.status_code}")
    print(f"GET Single Category Response: {resp_get_one.json()}")
    assert resp_get_one.status_code == 200

    # DELETE Category
    resp_delete = client.delete(f'/api/v1/masters/categories/{cat_id}', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"DELETE Category Status: {resp_delete.status_code}")
    assert resp_delete.status_code in [200, 204]
    print("✅ Delete executed successfully.")

    # Verification GET (Retrieve again, should be 404 now)
    resp_get_deleted = client.get(f'/api/v1/masters/categories/{cat_id}', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"GET Deleted Category Status: {resp_get_deleted.status_code} (Should be 404)")
    assert resp_get_deleted.status_code == 404
    print("✅ Verification GET returned 404 as expected.")

    # 6. GET Products, Transactions & Analytics
    print("\n--- 4. Verification of Main Query/Transactional GET Endpoints ---")
    
    # Products GET
    resp_products = client.get('/api/v1/masters/products', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"GET Products ('wh_nashik') Status: {resp_products.status_code}, Count: {len(resp_products.json().get('data', []))}")
    assert resp_products.status_code == 200

    # Sales Orders GET
    resp_sales = client.get('/api/v1/sales', HTTP_X_WAREHOUSE_ID='wh_nashik')
    print(f"GET Sales Orders ('wh_nashik') Status: {resp_sales.status_code}, Count: {len(resp_sales.json().get('data', []))}")
    assert resp_sales.status_code == 200

    # Purchases GET
    resp_purchases = client.get('/api/v1/transactions/purchases', HTTP_X_WAREHOUSE_ID='wh_nashik')
    purchases_data = resp_purchases.json().get('data', [])
    print(f"GET Purchases ('wh_nashik') Status: {resp_purchases.status_code}, Count: {len(purchases_data) if isinstance(purchases_data, list) else 'N/A'}")
    assert resp_purchases.status_code == 200

    print("\n🎉 ALL API OPERATIONS (GET, POST, CRUD, AND ISOLATION) ARE FULLY INTEGRAL AND VERIFIED! 🎉")

if __name__ == '__main__':
    run_tests()
