import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from rest_framework.test import APIClient
from api.models import User, Order
from api.auth import generate_tokens

u = User.objects.filter(role='INVENTORY').first()
o = Order.objects.using('wh_nashik').filter(status='Completed').first()

if o and u:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + generate_tokens(str(u.id), u.email, u.role)[0])
    try:
        resp = client.post('/api/v1/transactions/returns', {
            'orderId': o.id,
            'vehicleNumber': 'MH-12',
            'salesReturnBillNumber': 'RT-001',
            'returnDate': '2026-06-12',
            'returnReason': 'Defective'
        }, content_type='application/json', HTTP_X_WAREHOUSE_ID='7')
        print(resp.status_code)
        print(resp.content)
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print('User or order not found')
