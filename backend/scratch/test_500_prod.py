import urllib.request
import json
import urllib.error

BASE = "https://simply-useful-backend.onrender.com/api/v1"

# Login
req = urllib.request.Request(f"{BASE}/auth/login", method='POST',
    data=json.dumps({"email": "pritika@kamla.com", "password": "admin123"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode())
token = data['data']['accessToken']
print("Logged in. Token length:", len(token))

def test(method, path, wh_id=None, body=None):
    url = f"{BASE}/{path}"
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    if wh_id:
        headers['X-Warehouse-ID'] = wh_id
    req = urllib.request.Request(url, method=method, headers=headers,
        data=json.dumps(body).encode('utf-8') if body else None)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            return e.code, json.loads(body_text)
        except:
            return e.code, body_text[:1000]

# Test 1: GET leads with WH=2
print("\n=== GET /crm/leads with WH=2 ===")
code, data = test('GET', 'crm/leads', wh_id='2')
print(f"Status: {code}")
print(f"Data: {str(data)[:300]}")

# Test 2: GET leads with GLOBAL
print("\n=== GET /crm/leads with GLOBAL ===")
code, data = test('GET', 'crm/leads', wh_id='GLOBAL')
print(f"Status: {code}")
print(f"Data: {str(data)[:300]}")

# Test 3: GET leads with no WH header
print("\n=== GET /crm/leads (no WH header) ===")
code, data = test('GET', 'crm/leads')
print(f"Status: {code}")
print(f"Data: {str(data)[:300]}")

# Test 4: POST /sales with WH=2
print("\n=== POST /sales with WH=2 ===")
code, data = test('POST', 'sales', wh_id='2', body={
    'date': '2026-06-19T00:00:00Z',
    'partyType': 'Dealer',
    'partyName': 'Test Dealer',
    'distributor': 'Test Distributor',
    'narration': 'test',
    'status': 'Pending',
    'grandTotal': 100.0,
    'items': [],
    'warehouseId': '2'
})
print(f"Status: {code}")
print(f"Data: {str(data)[:500]}")

# Test 5: POST /sales with no WH header
print("\n=== POST /sales (no WH header) ===")
code, data = test('POST', 'sales', body={
    'date': '2026-06-19T00:00:00Z',
    'partyType': 'Dealer',
    'partyName': 'Test Dealer',
    'distributor': 'Test Distributor',
    'narration': 'test',
    'status': 'Pending',
    'grandTotal': 100.0,
    'items': [],
    'warehouseId': '2'
})
print(f"Status: {code}")
print(f"Data: {str(data)[:500]}")

# Test 6: POST /sales with GLOBAL
print("\n=== POST /sales with GLOBAL ===")
code, data = test('POST', 'sales', wh_id='GLOBAL', body={
    'date': '2026-06-19T00:00:00Z',
    'partyType': 'Dealer',
    'partyName': 'Test Dealer',
    'distributor': 'Test Distributor',
    'narration': 'test',
    'status': 'Pending',
    'grandTotal': 100.0,
    'items': [],
    'warehouseId': '2'
})
print(f"Status: {code}")
print(f"Data: {str(data)[:500]}")
