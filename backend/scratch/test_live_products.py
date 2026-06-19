import urllib.request
import urllib.error
import json
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

url = "https://simply-useful.onrender.com/api/v1/masters/products"
headers = {
    "Authorization": f"Bearer {token}",
    "X-Warehouse-ID": "GLOBAL"
}

req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        status = response.getcode()
        body = response.read().decode('utf-8')
        print(f"Status: {status}")
        try:
            data = json.loads(body)
            products = data.get('data', [])
            print(f"Success! Found {len(products)} products.")
        except json.JSONDecodeError:
            print("Response is not JSON:", body[:200])
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print("Response body:", e.read().decode('utf-8')[:500])
except Exception as e:
    print(f"Error: {e}")
