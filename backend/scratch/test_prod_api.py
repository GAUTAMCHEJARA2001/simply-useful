import requests
import sys

print("Starting test...")
url = "https://simply-useful-backend.onrender.com/api/v1/auth/login"
try:
    print("Sending login request...")
    resp = requests.post(url, json={"email": "super@kamla.com", "password": "admin123"}, timeout=30)
    print("Login status code:", resp.status_code)
    if resp.status_code == 200:
        token = resp.json().get('data', {}).get('accessToken')
        if token:
            print("Logged in successfully.")
            
            # Test expenses
            print("Sending expenses request...")
            res2 = requests.get("https://simply-useful-backend.onrender.com/api/v1/expenses", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"}, timeout=30)
            print("Expenses Code:", res2.status_code)
            print("Expenses Body:", res2.text[:1000])

            # Test visits
            print("Sending visits request...")
            res3 = requests.get("https://simply-useful-backend.onrender.com/api/v1/visits", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"}, timeout=30)
            print("Visits Code:", res3.status_code)
            print("Visits Body:", res3.text[:1000])

            # Test sales
            print("Sending sales request...")
            res4 = requests.get("https://simply-useful-backend.onrender.com/api/v1/sales", headers={"Authorization": f"Bearer {token}", "X-Warehouse-Id": "GLOBAL"}, timeout=30)
            print("Sales Code:", res4.status_code)
            print("Sales Body:", res4.text[:1000])
        else:
            print("Token not found in response:", resp.json())
    else:
        print("Login failed:", resp.status_code, resp.text)
except Exception as e:
    print("An error occurred:", str(e))
    sys.exit(1)
