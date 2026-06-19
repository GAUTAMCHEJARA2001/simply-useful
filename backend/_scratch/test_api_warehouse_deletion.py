import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import urllib.request
import urllib.error
import json
from api.models import User
from api.auth import generate_tokens

def run_test():
    u = User.objects.using('default').filter(role='SUPERADMIN').first()
    token, _ = generate_tokens(str(u.id), u.email, u.role, u.companyid_id)
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # 1. Create a warehouse
    payload = {
        "name": "Delete Me Wh",
        "active": True
    }
    print("🏗️ Creating warehouse via POST...")
    data_payload = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:4000/api/v1/masters/warehouses', data=data_payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"POST Status: {resp.status}")
            print(f"POST Response: {data}")
            wh_id = data.get('data', {}).get('id')
    except urllib.error.HTTPError as e:
        print(f"POST Failed: {e.code} - {e.read().decode('utf-8')}")
        return

    print(f"Created Warehouse ID: {wh_id}")

    # 2. Delete the warehouse
    print(f"🗑️ Deleting warehouse ID {wh_id} via DELETE...")
    req_del = urllib.request.Request(f'http://127.0.0.1:4000/api/v1/masters/warehouses/{wh_id}', headers=headers, method='DELETE')
    try:
        with urllib.request.urlopen(req_del) as resp_del:
            print(f"DELETE Status: {resp_del.status}")
            print("Warehouse deleted successfully via API!")
    except urllib.error.HTTPError as e:
        print(f"DELETE Failed: {e.code} - {e.read().decode('utf-8')}")


if __name__ == '__main__':
    run_test()
