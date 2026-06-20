import os
import django
import time
import jwt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import json

c = Client()
now = int(time.time())

# Superadmin Token
access_payload_admin = {
    'userId': 'c12a7dab20c374ab69693f6e',
    'email': 'super@kamla.com',
    'role': 'SUPERADMIN',
    'companyId': 'cmpwp1h8v0000sscdshw8thbl',
    'exp': now + 7*24*60*60
}
token_admin = jwt.encode(access_payload_admin, 'simply-useful-secret-key-123-super-secure-key-2026', algorithm='HS256')

print("=== ADMIN GET USER ASSIGNMENTS (GLOBAL) ===")
# Use real ID
resp = c.get('/api/v1/masters/users/c12a7dab20c374ab69693f6e/assignments', HTTP_AUTHORIZATION=f'Bearer {token_admin}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"GET: {resp.status_code}")
if resp.status_code == 200:
    print(resp.json())
else:
    print(resp.content)

print("\n=== ADMIN POST USER ASSIGNMENTS (GLOBAL) ===")
payload = {
    "brands": [1],
    "categories": [1],
    "products": [],
    "warehouses": ["GLOBAL"]
}
resp = c.post('/api/v1/masters/users/c12a7dab20c374ab69693f6e/assignments', data=json.dumps(payload), content_type="application/json", HTTP_AUTHORIZATION=f'Bearer {token_admin}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"POST: {resp.status_code}")
if resp.status_code == 200:
    print("Success")
else:
    print(resp.content)
