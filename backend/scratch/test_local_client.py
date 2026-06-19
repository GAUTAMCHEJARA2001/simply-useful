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
resp = c.get('/api/v1/masters/products', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status code: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    products = data.get('data', [])
    print(f"Found {len(products)} products.")
else:
    print(resp.content)
