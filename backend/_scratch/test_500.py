import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from api.views import OrderViewSet
from api.auth import JWTUser
from rest_framework.request import Request

req = RequestFactory().put('/sales/ORD-029173/status', {'status': 'Approved'}, content_type='application/json')
drf_req = Request(req)
drf_req._request.user = JWTUser('c8af2f2f75bd24e5b9f7a759', 'kiran@kamla.com', 'INVENTORY', 'cmpwp1h8v0000sscdshw8thbl')
drf_req._data = {'status': 'Approved'}

view = OrderViewSet()
view.request = drf_req
view.format_kwarg = None
view.kwargs = {'pk': 'c8b749a97cb2542c7b0a8b89'}

try:
    response = view.update_status(drf_req, pk='c8b749a97cb2542c7b0a8b89')
    print("Success:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
