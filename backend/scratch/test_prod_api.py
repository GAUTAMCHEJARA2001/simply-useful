import requests

url = "https://simply-useful-backend.onrender.com/api/v1/auth/login"
resp = requests.post(url, json={"email": "pritika@kamla.com", "password": "password123"})
if resp.status_code == 200:
    token = resp.json().get('data', {}).get('access')
    if token:
        print("Logged in as Pritika.")
        
        # Test expenses
        res2 = requests.get("https://simply-useful-backend.onrender.com/api/v1/expenses", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"})
        print("Expenses Code:", res2.status_code)
        print("Expenses Body:", res2.text[:1000])

        res3 = requests.get("https://simply-useful-backend.onrender.com/api/v1/visits", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"})
        print("Visits Code:", res3.status_code)
        print("Visits Body:", res3.text[:1000])

        res4 = requests.get("https://simply-useful-backend.onrender.com/api/v1/sales", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"})
        print("Sales Code:", res4.status_code)
        print("Sales Body:", res4.text[:1000])
else:
    print("Login failed:", resp.status_code, resp.text)
