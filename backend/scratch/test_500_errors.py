import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
from django.test import RequestFactory
from core.middleware import HeaderTenantMiddleware
from rest_framework.test import force_authenticate
from core.models import User

user = User.objects.get(email='pritika@kamla.com')

factory = RequestFactory()

# Test 1: POST to sales (order creation) with warehouse 2
print("=== Test 1: POST /api/v1/sales with WH=2 ===")
from api.views import OrderViewSet
request = factory.post('/api/v1/sales/', data=json.dumps({
    'date': '2026-06-19T00:00:00Z',
    'partyType': 'Dealer',
    'partyName': 'Test Dealer',
    'distributor': 'Test Distributor',
    'narration': 'test',
    'status': 'Pending',
    'grandTotal': 100.0,
    'items': [],
    'warehouseId': '2'
}), content_type='application/json', HTTP_X_WAREHOUSE_ID='2')
force_authenticate(request, user=user)

def get_response_sales(r):
    view = OrderViewSet.as_view({'post': 'create'})
    try:
        response = view(r)
        print("Status:", response.status_code)
        print("Data:", str(response.data)[:500])
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware = HeaderTenantMiddleware(get_response_sales)
response = middleware(request)

# Test 2: GET leads with warehouse 2
print("\n=== Test 2: GET /api/v1/crm/leads with WH=2 ===")
from api.views import LeadViewSet
request2 = factory.get('/api/v1/crm/leads/', HTTP_X_WAREHOUSE_ID='2')
force_authenticate(request2, user=user)

def get_response_leads(r):
    view = LeadViewSet.as_view({'get': 'list'})
    try:
        response = view(r)
        print("Status:", response.status_code)
        print("Data:", str(response.data)[:500])
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware2 = HeaderTenantMiddleware(get_response_leads)
response2 = middleware2(request2)

# Test 3: GET leads with GLOBAL
print("\n=== Test 3: GET /api/v1/crm/leads with GLOBAL ===")
request3 = factory.get('/api/v1/crm/leads/', HTTP_X_WAREHOUSE_ID='GLOBAL')
force_authenticate(request3, user=user)

middleware3 = HeaderTenantMiddleware(get_response_leads)
response3 = middleware3(request3)
