import urllib.request, urllib.error, json
login_req = urllib.request.Request('http://localhost:4000/api/v1/auth/login', data=json.dumps({"email":"admin@simplyuseful.com","password":"password"}).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
try:
    res = urllib.request.urlopen(login_req)
    data = json.loads(res.read().decode('utf-8'))
    token = data.get('data', {}).get('accessToken')
except urllib.error.HTTPError as e:
    print("Login HTTP", e.code, e.read().decode('utf-8'))
    exit(1)

req = urllib.request.Request('http://localhost:4000/api/v1/transactions/productions', data=b'{"productId":"1","quantity":1,"warehouseId":"1"}', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method='POST')
try:
    res = urllib.request.urlopen(req)
    print("HTTP 200")
    print(res.read().decode('utf-8')[:200])
except urllib.error.HTTPError as e:
    print("HTTP", e.code)
    print(e.read().decode('utf-8')[:2000])
except Exception as e:
    print("Error:", str(e))
