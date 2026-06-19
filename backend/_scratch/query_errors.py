import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import urllib.request
import urllib.error
import json
from api.auth import generate_tokens
from core.models import User

def query_endpoints():
    u = User.objects.using('default').filter(role='SUPERADMIN').first()
    if not u:
        # Create temp user if none exists
        from core.models import Company
        company, _ = Company.objects.get_or_create(
            id='cmo75yliq0000wesurjpett1n', 
            defaults={'name': 'Simply Useful', 'active': True, 'stockmethod': 'FIFO'}
        )
        u, _ = User.objects.using('default').get_or_create(
            email='admin@alpha.com',
            defaults={
                'id': 'superadmin-1',
                'name': 'System Admin',
                'role': 'SUPERADMIN',
                'hashedpassword': 'mocked_password_hash',
                'active': True,
                'companyid': company
            }
        )
    
    token, _ = generate_tokens(str(u.id), u.email, u.role, u.companyid_id)
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    endpoints = [
        '/api/v1/masters/warehouses',
        '/api/v1/dealers',
        '/api/v1/distributors',
        '/api/v1/products',
        '/api/v1/sales',
        '/api/v1/users',
        '/api/v1/visits',
        '/api/v1/expenses',
        '/api/v1/masters/settings?t=1781523437184',
        '/api/v1/reports/current-stock'
    ]

    print("🛰️ Querying endpoints against localhost:4000...")
    for ep in endpoints:
        req = urllib.request.Request(f'http://127.0.0.1:4000{ep}', headers=headers, method='GET')
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                print(f"✅ {ep} -> {resp.status} (Count: {len(data.get('data', [])) if isinstance(data.get('data'), list) else 'Dict/Other'})")
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode('utf-8')
                print(f"❌ {ep} -> {e.code} Error: {err_body[:200]}")
            except Exception:
                print(f"❌ {ep} -> {e.code} Error: {e.reason}")
        except Exception as e:
            print(f"❌ {ep} -> Failed: {e}")

if __name__ == '__main__':
    query_endpoints()
