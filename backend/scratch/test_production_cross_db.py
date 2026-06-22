import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from core.models import User, Warehouse
from api.models import Product
from api.views import transaction_productions, transaction_productions_detail
from core.middleware import HeaderTenantMiddleware

# 1. User
user = User.objects.filter(role='SUPERADMIN').first()
if not user:
    user = User.objects.first()
if user:
    user.is_authenticated = True

# 2. Warehouses
wh_navsari = Warehouse.objects.filter(db_name='wh_navsari').first()
wh_nashik = Warehouse.objects.filter(db_name='wh_nashik').first()

if not wh_navsari or not wh_nashik:
    print("This test requires both wh_navsari and wh_nashik warehouses.")
    exit(1)

# Get a product from NAVSARI schema (e.g. FG-GOLD)
navsari_product = Product.objects.using('wh_navsari').filter(productcode='FG-GOLD').first()
if not navsari_product:
    navsari_product = Product.objects.using('wh_navsari').first()

if not navsari_product:
    print("No product found in wh_navsari schema.")
    exit(1)

print(f"Active Header Schema: wh_navsari")
print(f"Payload target warehouse: wh_nashik (ID: {wh_nashik.id})")
print(f"Payload product (from Navsari schema): {navsari_product.name} (ID: {navsari_product.id}, Code: {navsari_product.productcode})")

# Construct the payload targeting NASHIK but passing the NAVSARI product ID
# Set items: [] to bypass default BOM checks for simple testing
payload = {
    'productId': navsari_product.id,
    'warehouseId': wh_nashik.id,
    'quantity': 5,
    'remarks': 'Cross database production validation',
    'items': []
}

# The request is made under active tenant Navsari (header HTTP_X_WAREHOUSE_ID = wh_navsari.id)
factory = RequestFactory()
request = factory.post(
    '/api/v1/transactions/productions', 
    data=json.dumps(payload),
    content_type='application/json',
    HTTP_X_WAREHOUSE_ID=str(wh_navsari.id)
)
force_authenticate(request, user=user)

created_id = None

def get_response(r):
    global created_id
    try:
        response = transaction_productions(r)
        print("POST Response status:", response.status_code)
        print("POST Response data:", response.data)
        if response.status_code == 200:
            created_id = response.data['data']['id']
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware = HeaderTenantMiddleware(get_response)
middleware(request)

if created_id:
    print("\n--- Testing PUT update ---")
    put_payload = {
        'productId': navsari_product.id,
        'warehouseId': wh_nashik.id,
        'quantity': 15,
        'remarks': 'Cross database production update validation',
        'items': []
    }
    
    put_request = factory.put(
        f'/api/v1/transactions/productions/{created_id}', 
        data=json.dumps(put_payload),
        content_type='application/json',
        HTTP_X_WAREHOUSE_ID=str(wh_navsari.id)
    )
    force_authenticate(put_request, user=user)
    
    def get_put_response(r):
        try:
            response = transaction_productions_detail(r, pk=created_id)
            print("PUT Response status:", response.status_code)
            print("PUT Response data:", response.data)
            return response
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None
            
    put_middleware = HeaderTenantMiddleware(get_put_response)
    put_middleware(put_request)
