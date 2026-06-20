import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import jwt
import time
from api.models import User

so = User.objects.filter(role='SALES').first()
if not so:
    print("No Sales Officer found.")
    exit(0)

print(f"Testing assignments for SO: {so.email}")

JWT_SECRET = 'simply-useful-secret-key-123-super-secure-key-2026'
now = int(time.time())
access_payload = {
    'userId': 'superadmin-1',
    'email': 'super@kamla.com',
    'role': 'SUPERADMIN',
    'companyId': so.companyid_id if hasattr(so, 'companyid_id') else so.companyid,
    'exp': now + 7 * 24 * 60 * 60
}
token = jwt.encode(access_payload, JWT_SECRET, algorithm='HS256')

c = Client()
print("\nFetching user assignments in GLOBAL mode...")
resp = c.get(f'/api/v1/masters/users/{so.id}/assignments', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    print(resp.json())
else:
    print(f"Error: {resp.content[:500]}")

print("\nFetching user assignments in wh_navsari_factory mode...")
from core.models import Warehouse
wh = Warehouse.objects.filter(schema_name='wh_navsari_factory').first()
resp2 = c.get(f'/api/v1/masters/users/{so.id}/assignments', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID=str(wh.id))
print(f"Status: {resp2.status_code}")
if resp2.status_code == 200:
    print(resp2.json())
else:
    print(f"Error: {resp2.content[:500]}")
