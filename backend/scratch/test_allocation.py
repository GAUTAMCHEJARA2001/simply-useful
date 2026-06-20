import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
import jwt
import time
from api.models import User, Userproductaccess, Product

# Let's find a Sales Officer
so = User.objects.filter(role='SALES').first()
if not so:
    print("No Sales Officer found.")
    exit(0)

print(f"Testing with Sales Officer: {so.email} (ID: {so.id})")

# Let's see what products are assigned to them
assignments = Userproductaccess.objects.filter(userid=so)
print(f"Product assignments count: {assignments.count()}")
if assignments.count() > 0:
    print("Assigned product IDs:")
    for a in assignments:
        print(f" - {a.productid_id}")

# Create a token for the Sales Officer
JWT_SECRET = 'simply-useful-secret-key-123-super-secure-key-2026'
now = int(time.time())
access_payload = {
    'userId': str(so.id),
    'email': so.email,
    'role': so.role,
    'companyId': so.companyid_id if hasattr(so, 'companyid_id') else so.companyid,
    'exp': now + 7 * 24 * 60 * 60
}
token = jwt.encode(access_payload, JWT_SECRET, algorithm='HS256')

c = Client()
print("\nFetching products as Sales Officer in GLOBAL mode...")
resp = c.get('/api/v1/products', HTTP_AUTHORIZATION=f'Bearer {token}', HTTP_X_WAREHOUSE_ID='GLOBAL')
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    products = data.get('data', [])
    print(f"Products returned to SO: {len(products)}")
    for p in products:
        print(f" - {p.get('name')}")
else:
    print(f"Error: {resp.content[:200]}")
