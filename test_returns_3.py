import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from api.views import transaction_returns
from api.models import User, Order

user = User.objects.get(email='jignesh@kamla.com')
user.is_authenticated = True
factory = RequestFactory()

# Find an order
order = Order.objects.using('wh_nashik').first()

request = factory.post('/api/v1/transactions/returns', data={
    "orderId": order.id,
    "returnType": "SALE",
    "returnReason": "Defective",
    "vehicleNumber": "MH-12"
}, content_type='application/json')

force_authenticate(request, user=user)

try:
    response = transaction_returns(request)
    print("Status:", response.status_code)
    try:
        print("Content:", response.content)
    except:
        print("Data:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
