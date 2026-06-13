import os, django, traceback, urllib.request, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.auth import generate_tokens
from api.models import User

user = User.objects.filter(role='SUPERADMIN').first()
token = generate_tokens(str(user.id), user.email, user.role, user.companyid_id)[0]

# Test 1: With numeric ID (7 = NASHIK)
print("=== Test 1: X-Warehouse-ID: 7 ===")
try:
    req = urllib.request.Request(
        'http://localhost:4000/api/v1/masters/products', 
        headers={'X-Warehouse-ID': '7', 'Authorization': 'Bearer ' + token}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    products = data.get('data', [])
    print(f'Status: {res.status}, Products: {len(products)}')
    for p in products[:3]:
        print(f"  {p.get('name')}")
except urllib.error.HTTPError as e:
    print(f'HTTPError: {e.code}')

# Test 2: With name string "NASHIK"
print("\n=== Test 2: X-Warehouse-ID: NASHIK ===")
try:
    req = urllib.request.Request(
        'http://localhost:4000/api/v1/masters/products', 
        headers={'X-Warehouse-ID': 'NASHIK', 'Authorization': 'Bearer ' + token}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    products = data.get('data', [])
    print(f'Status: {res.status}, Products: {len(products)}')
    for p in products[:3]:
        print(f"  {p.get('name')}")
except urllib.error.HTTPError as e:
    print(f'HTTPError: {e.code}')

# Test 3: With GLOBAL
print("\n=== Test 3: X-Warehouse-ID: GLOBAL ===")
try:
    req = urllib.request.Request(
        'http://localhost:4000/api/v1/masters/products', 
        headers={'X-Warehouse-ID': 'GLOBAL', 'Authorization': 'Bearer ' + token}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    products = data.get('data', [])
    print(f'Status: {res.status}, Products: {len(products)}')
except urllib.error.HTTPError as e:
    print(f'HTTPError: {e.code}')
