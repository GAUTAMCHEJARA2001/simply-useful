import os
import django
import time
import jwt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client

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

# Sales Token
access_payload_sales = {
    'userId': 'c9e909a5b3a884b259d28ea', # Assuming a sales user ID, wait, let's look up Pritika's ID
    'email': 'pritika.patel@example.com',
    'role': 'SALES_OFFICER',
    'companyId': 'cmpwp1h8v0000sscdshw8thbl',
    'exp': now + 7*24*60*60
}

from api.models import User
sales_user = User.objects.using('default').filter(role='SALES_OFFICER').first()
if sales_user:
    access_payload_sales['userId'] = sales_user.id
    access_payload_sales['email'] = sales_user.email
    
token_sales = jwt.encode(access_payload_sales, 'simply-useful-secret-key-123-super-secure-key-2026', algorithm='HS256')


endpoints = [
    '/api/v1/masters/categories',
    '/api/v1/masters/brands',
    '/api/v1/masters/units',
]

print("=== ADMIN GLOBAL ENDPOINTS ===")
for ep in endpoints:
    resp = c.get(ep, HTTP_AUTHORIZATION=f'Bearer {token_admin}', HTTP_X_WAREHOUSE_ID='GLOBAL')
    print(f"{ep}: {resp.status_code}")

print("\n=== SALES GLOBAL ENDPOINTS (Products) ===")
resp = c.get('/api/v1/products', HTTP_AUTHORIZATION=f'Bearer {token_sales}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"/api/v1/products: {resp.status_code}")
if resp.status_code == 200:
    print(f"Products returned: {len(resp.json().get('data', []))}")
else:
    print(resp.content)
