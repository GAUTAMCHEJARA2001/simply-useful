import urllib.request
import json
import urllib.error

url_login = "https://simply-useful-backend.onrender.com/api/v1/auth/login"
req = urllib.request.Request(url_login, method='POST', data=json.dumps({"email": "pritika@kamla.com", "password": "admin123"}).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    token = data.get('data', {}).get('accessToken')
    print("Token length:", len(token) if token else "NO TOKEN")
    
    if token:
        for ep in ['visits', 'expenses', 'sales']:
            print(f"\n--- Fetching {ep} ---")
            req2 = urllib.request.Request(f"https://simply-useful-backend.onrender.com/api/v1/{ep}", method='GET', headers={'Authorization': f'Bearer {token}', 'X-Warehouse-Id': 'undefined'})
            try:
                resp2 = urllib.request.urlopen(req2)
                print(resp2.status)
                print(resp2.read().decode()[:500])
            except urllib.error.HTTPError as e:
                print(e.code)
                print(e.read().decode()[:2000])
except urllib.error.HTTPError as e:
    print("Login failed:", e.code)
    print(e.read().decode())
