import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
from django.test import RequestFactory
from core.models import User
from api.views import LeadViewSet
from rest_framework.test import force_authenticate
from api.auth import JWTUser

user_model = User.objects.get(email='admin@simplyuseful.com')
user = JWTUser(
    user_id=user_model.id,
    email=user_model.email,
    role=user_model.role,
    company_id=user_model.companyid_id
)

factory = RequestFactory()
request = factory.get('/api/v1/crm/leads/dashboard', HTTP_X_WAREHOUSE_ID='GLOBAL')
force_authenticate(request, user=user)

view = LeadViewSet.as_view({'get': 'get_dashboard_metrics'})

try:
    response = view(request)
    print("Status Code:", response.status_code)
    print("Response Data:", getattr(response, 'data', None))
except Exception as e:
    import traceback
    traceback.print_exc()
