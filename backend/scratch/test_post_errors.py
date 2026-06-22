import os
import django
import time
import jwt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from django.test import Client
from api.models import User, Product, Warehouse, Order, Purchase

# Setup Client
c = Client()
now = int(time.time())

# Superadmin Token
access_payload_admin = {
    'userId': 'superadmin-1',
    'email': 'super@kamla.com',
    'role': 'SUPERADMIN',
    'companyId': 'cmpwp1h8v0000sscdshw8thbl',
    'exp': now + 7*24*60*60
}
token_admin = jwt.encode(access_payload_admin, 'simply-useful-secret-key-123-super-secure-key-2026', algorithm='HS256')
headers = {
    'HTTP_AUTHORIZATION': f'Bearer {token_admin}',
    'HTTP_X_WAREHOUSE_ID': 'GLOBAL', # simulate frontend global view header
}

# Resolve active warehouse & product codes for payload
wh = Warehouse.objects.filter(active=True).first()
wh_id = str(wh.id) if wh else "4"
wh_name = wh.name if wh else "NAVSARI"
wh_db = wh.db_name if wh else "wh_navsari"

prod = Product.objects.using(wh_db).first()
prod_id = prod.id if prod else ""
prod_code = prod.productcode if prod else ""

print(f"Using Warehouse ID: {wh_id} (schema: {wh_db}), Product ID: {prod_id} (code: {prod_code})")

# Test 1: POST /api/v1/bom
print("\n=== Test 1: POST /api/v1/bom ===")
bom_data = {
    "name": "Test Recipe",
    "productId": prod_id,
    "outputQuantity": 1.0,
    "items": []
}
resp = c.post('/api/v1/bom', data=bom_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 2: POST /api/v1/sales (OrderViewSet)
print("\n=== Test 2: POST /api/v1/sales ===")
sales_data = {
    "date": "2026-06-20T12:00:00Z",
    "partyType": "Dealer",
    "partyName": "Test Dealer",
    "distributor": "Test Distributor",
    "narration": "Test sale",
    "status": "Pending",
    "grandTotal": 100.0,
    "warehouseId": wh_id,
    "items": []
}
resp = c.post('/api/v1/sales', data=sales_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 3: POST /api/v1/transactions/sales (transaction_sales view)
print("\n=== Test 3: POST /api/v1/transactions/sales ===")
resp = c.post('/api/v1/transactions/sales', data=sales_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 4: POST /api/v1/transactions/purchases (transaction_purchases view)
print("\n=== Test 4: POST /api/v1/transactions/purchases ===")
purchase_data = {
    "date": "2026-06-20T12:00:00Z",
    "vendorName": "Test Supplier",
    "warehouseId": wh_id,
    "grandTotal": 200.0,
    "items": [
        {
            "productId": prod_id,
            "qty": 10,
            "rate": 20.0,
            "tax_percent": 18.0
        }
    ]
}
resp = c.post('/api/v1/transactions/purchases', data=purchase_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 5: POST /api/v1/transactions/adjustments (transaction_adjustments view)
print("\n=== Test 5: POST /api/v1/transactions/adjustments ===")
adjustment_data = {
    "productId": prod_id,
    "quantityChange": 5.0,
    "reason": "Test Adjustment",
    "warehouseId": wh_id
}
resp = c.post('/api/v1/transactions/adjustments', data=adjustment_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 6: POST /api/v1/transactions/productions (transaction_productions view)
print("\n=== Test 6: POST /api/v1/transactions/productions ===")
production_data = {
    "productId": prod_id,
    "quantity": 10.0,
    "warehouseId": wh_id,
    "items": []
}
resp = c.post('/api/v1/transactions/productions', data=production_data, content_type='application/json', **headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.content.decode()[:500]}")

# Test 7: POST /api/v1/transactions/returns (transaction_returns view)
print("\n=== Test 7: POST /api/v1/transactions/returns ===")
o = Order.objects.using(wh_db).filter(status='Completed').first()
if o:
    return_data = {
        'orderId': o.id,
        'vehicleNumber': 'MH-12',
        'salesReturnBillNumber': 'RT-001',
        'returnDate': '2026-06-12',
        'returnReason': 'Defective'
    }
    resp = c.post('/api/v1/transactions/returns', data=return_data, content_type='application/json', **headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.content.decode()[:500]}")
else:
    print("No completed order found to return.")

