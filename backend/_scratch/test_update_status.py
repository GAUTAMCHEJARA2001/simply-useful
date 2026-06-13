import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from api.views import OrderViewSet
from api.auth import JWTUser
from rest_framework.request import Request
from api.models import Order
from rest_framework.parsers import JSONParser
import io

# Proper mock using JSON
req = RequestFactory().put('/sales/ORD-029173/status', b'{"status": "Approved"}', content_type='application/json')
drf_req = Request(req, parsers=[JSONParser()])
drf_req._user = JWTUser('super_admin_id', 'super@kamla.com', 'SUPER_ADMIN', 'cmpwp1h8v0000sscdshw8thbl')
drf_req.user = drf_req._user

view = OrderViewSet()
view.request = drf_req
view.format_kwarg = None
view.kwargs = {'pk': 'ORD-029173'}
view.permission_classes = []
view.authentication_classes = []

try:
    response = view.update_status(drf_req, pk='ORD-029173')
    print("Response Status:", response.status_code)
    print("Response Content:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
