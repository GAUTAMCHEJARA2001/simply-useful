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

wh = Warehouse.objects.filter(db_name='wh_navsari').first()
if wh:
    req = rf.get('/masters/products', HTTP_X_WAREHOUSE_ID=str(wh.id))
    force_authenticate(req, user=mock_user)
    
    from api.db_router import set_current_db
    from django.db import connection
    set_current_db(wh.db_name)
    connection.set_tenant(wh)
    
    print(f"Testing for warehouse: {wh.name}")
    try:
        response = view(req)
        print("Status:", response.status_code)
    except Exception as e:
        import traceback
        traceback.print_exc()
