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
user = User.objects.using('default').filter(role='PRODUCTION').first()
if not user:
    print("NO PRODUCTION USER FOUND!")
else:
    mock_user = MockUser(user)
    view = ProductViewSet.as_view({'get': 'list'})

    print("--- TESTING DEFAULT DB (NO WAREHOUSE) FOR PRODUCTION USER ---")
    req = rf.get('/masters/products')
    force_authenticate(req, user=mock_user)
    try:
        response = view(req)
        print("Status:", response.status_code)
    except Exception as e:
        import traceback
        traceback.print_exc()
