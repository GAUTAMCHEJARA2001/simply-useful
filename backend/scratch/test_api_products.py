import os
import json
import jwt
import time
import urllib.request

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

url = "https://simply-useful.onrender.com/api/v1/products"
headers = {
    "Authorization": f"Bearer {token}",
    "X-Warehouse-ID": "GLOBAL"
}

req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        status = response.getcode()
        body = response.read().decode('utf-8')
        print("Status:", status)
        try:
            data = json.loads(body)
            products = data.get('data', data) if isinstance(data, dict) else data
            print(f"Returned {len(products)} products")
        except Exception as e:
            print("Response is not JSON:", body)
except Exception as e:
    print(f"Error: {e}")
