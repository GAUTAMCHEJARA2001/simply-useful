import os, sys, django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from rest_framework.test import APIClient
from api.models import User, Warehouse, Product
from api.auth import generate_tokens

def test_global_reports():
    # Find a user to act as admin/superadmin
    u = User.objects.filter(email='jignesh@kamla.com').first()
    if not u:
        u = User.objects.filter(role__in=['ADMIN', 'SUPERADMIN']).first()
    if not u:
        print("No ADMIN or SUPERADMIN user found to run tests.")
        return
    
    print(f"Testing as user: {u.email} (Role: {u.role})")
    
    # Print all active warehouses
    active_whs = list(Warehouse.objects.filter(active=True))
    print(f"Active warehouses: {[(wh.id, wh.name, wh.db_name) for wh in active_whs]}")
    
    # Resolve a product for stock ledger
    target_product_id = None
    for wh in active_whs:
        if not wh.db_name:
            continue
        try:
            prod = Product.objects.using(wh.db_name).filter(productcode='FG-GOLD').first()
            if not prod:
                prod = Product.objects.using(wh.db_name).first()
            if prod:
                target_product_id = prod.id
                print(f"Found target product ID: {target_product_id} (Code: {prod.productcode}, Name: {prod.name}) from warehouse database '{wh.db_name}'")
                break
        except Exception as e:
            print(f"Error querying product in warehouse '{wh.name}' ({wh.db_name}): {e}")
            
    if not target_product_id:
        print("No products found in any active warehouse database.")
            
    client = APIClient()
    token = generate_tokens(str(u.id), u.email, u.role)[0]
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    
    # Headers to simulate GLOBAL warehouse mode
    headers = {
        'HTTP_X_WAREHOUSE_ID': 'GLOBAL'
    }
    
    endpoints = [
        ('/api/v1/reports/current-stock', 'Current Stock'),
        ('/api/v1/reports/low-stock', 'Low Stock'),
        ('/api/v1/reports/aggregate-stock', 'Aggregate Stock'),
        ('/api/v1/reports/sales-summary', 'Sales Summary'),
    ]
    
    if target_product_id:
        endpoints.append((f'/api/v1/reports/stock-ledger/{target_product_id}', 'Stock Ledger'))
        
    for url, name in endpoints:
        print(f"\n--- Testing {name} Endpoint: {url} (GLOBAL mode) ---")
        try:
            resp = client.get(url, **headers)
            print(f"Status Code: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    actual_data = data.get('data')
                    # If actual_data is list, print its length; if dictionary, print keys or preview
                    if isinstance(actual_data, list):
                        print(f"Success! Returned a list with {len(actual_data)} items.")
                        if len(actual_data) > 0:
                            print("Sample item:", actual_data[0])
                    elif isinstance(actual_data, dict):
                        print(f"Success! Returned a dictionary.")
                        print("Keys:", list(actual_data.keys()))
                        if 'items' in actual_data and isinstance(actual_data['items'], list):
                            print(f"Ledger items length: {len(actual_data['items'])}")
                            if len(actual_data['items']) > 0:
                                print("Sample ledger item:", actual_data['items'][0])
                    else:
                        print("Response data:", actual_data)
                else:
                    print("Response unsuccessful status:", data)
            else:
                print(f"Failed with status: {resp.status_code}")
                print(f"Response: {resp.content[:500]}")
        except Exception as e:
            print(f"Error testing {name} endpoint:")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_global_reports()
