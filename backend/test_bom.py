import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from api.views import BOMViewSet
from api.models import User
from rest_framework.request import Request
from rest_framework.test import force_authenticate
import json

factory = RequestFactory()
request = factory.get('/api/bom/', HTTP_X_WAREHOUSE_ID='GLOBAL')
user = User.objects.filter(role='SUPERADMIN').first()
if not user:
    user = User.objects.first()

user.is_authenticated = True
user.companyId = user.companyid_id if hasattr(user, 'companyid_id') else getattr(user, 'companyid', None)
force_authenticate(request, user=user)

BOMViewSet.permission_classes = []
view = BOMViewSet.as_view({'get': 'list'})
response = view(request)
print("Status:", response.status_code)
if response.status_code == 200:
    for item in response.data.get('data', [])[:2]:
        print(json.dumps(item, indent=2))
