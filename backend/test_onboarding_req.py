import requests
import json

base_url = 'http://localhost:4000/api/v1'

login_resp = requests.post(f"{base_url}/auth/login/", json={
    'email': 'admin@simplyuseful.com',
    'password': 'admin'
})
token = login_resp.json().get('token', {}).get('access')

headers = {
    'Authorization': f'Bearer {token}'
}

data = {
    'partyType': 'DEALER',
    'partyName': 'Test Dealer 2',
    'cityOrArea': 'Test City 2',
    'address': 'Test Address 2',
    'phone': '0987654321',
    'contactPerson': 'Test Person 2',
    'extendedData': json.dumps({"bankName": "HDFC", "faxNo": "12345"}),
    'gstNumber': 'TESTGST'
}

response = requests.post(f"{base_url}/onboarding/", data=data, headers=headers)
print("Response:", response.status_code, response.json())
