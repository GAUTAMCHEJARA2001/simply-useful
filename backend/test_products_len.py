import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
from api.views import ProductViewSet
from api.models import User, Warehouse

class MockUser:
    def __init__(self, user):
        self._user = user
        self.is_authenticated = True
    def __getattr__(self, name):
        return getattr(self._user, name)

rf = APIRequestFactory()
user = User.objects.using('default').filter(role='SUPERADMIN').first()
mock_user = MockUser(user)
view = ProductViewSet.as_view({'get': 'list'})

req = rf.get('/masters/products')
force_authenticate(req, user=mock_user)
response = view(req)
print("Status:", response.status_code)
if response.status_code == 200:
    print("Products returned:", len(response.data.get('data', [])))
else:
    print(response.data)
