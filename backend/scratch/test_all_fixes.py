import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import jwt
import time

JWT_SECRET = 'simply-useful-secret-key-123-super-secure-key-2026'
now = int(time.time())
access_payload = {
    'userId': 'superadmin-1',
    'email': 'super@kamla.com',
    'role': 'SUPERADMIN',
    'companyId': 'cmpwp1h8v0000sscdshw8thbl',
    'exp': now + 7 * 24 * 60 * 60
}
token = jwt.encode(access_payload, JWT_SECRET, algorithm='HS256')

c = Client()

print("=" * 60)
print("TEST 1: Global Products (/api/v1/products with X-Warehouse-ID: GLOBAL)")
print("=" * 60)
resp = c.get('/api/v1/products', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    products = data.get('data', [])
    print(f"Products count: {len(products)}")
    if products:
        print(f"First product: {products[0].get('name', 'N/A')} (SKU: {products[0].get('productCode', 'N/A')}, stock: {products[0].get('availableStock', 0)})")
else:
    print(f"Error response: {resp.content[:200]}")

print()
print("=" * 60)
print("TEST 2: Global Orders (/api/v1/sales with X-Warehouse-ID: GLOBAL)")
print("=" * 60)
resp2 = c.get('/api/v1/sales', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status: {resp2.status_code}")
if resp2.status_code == 200:
    data2 = resp2.json()
    orders = data2.get('data', [])
    print(f"Orders count: {len(orders)}")
    if orders:
        print(f"First order: {orders[0].get('orderId', 'N/A')} (status: {orders[0].get('status', 'N/A')})")
else:
    print(f"Error response: {resp2.content[:200]}")

print()
print("=" * 60)
print("TEST 3: Warehouse-specific Products (/api/v1/products with X-Warehouse-ID for wh_navsari_factory)")
print("=" * 60)
from core.models import Warehouse
wh = Warehouse.objects.filter(schema_name='wh_navsari_factory').first()
if wh:
    resp3 = c.get('/api/v1/products', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID=str(wh.id))
    print(f"Status: {resp3.status_code}")
    if resp3.status_code == 200:
        data3 = resp3.json()
        products3 = data3.get('data', [])
        print(f"Products in Navsari Factory: {len(products3)}")
    else:
        print(f"Error response: {resp3.content[:200]}")
else:
    print("wh_navsari_factory not found!")

print()
print("=" * 60)
print("TEST 4: Masters/Products endpoint (used by ProductsTab)")
print("=" * 60)
resp4 = c.get('/api/v1/masters/products', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status: {resp4.status_code}")
if resp4.status_code == 200:
    data4 = resp4.json()
    products4 = data4.get('data', [])
    print(f"Products count: {len(products4)}")
else:
    print(f"Error response: {resp4.content[:200]}")
