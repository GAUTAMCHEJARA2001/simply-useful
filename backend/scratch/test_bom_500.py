import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from core.models import User, Warehouse
from api.models import Product
from api.views import BOMViewSet
from core.middleware import HeaderTenantMiddleware

user = User.objects.filter(role='SUPERADMIN').first()
if not user:
    user = User.objects.first()
if user:
    user.is_authenticated = True

wh = Warehouse.objects.filter(db_name='wh_nashik').first()
if not wh:
    wh = Warehouse.objects.first()

product = Product.objects.using(wh.db_name).filter(productcode='FG-GOLD').first()
if not product:
    product = Product.objects.using(wh.db_name).first()

factory = RequestFactory()
payload = {
    'productId': product.id if product else 'invalid_id',
    'name': 'BOM standard test',
    'outputQuantity': 1.0,
    'items': [
        {'materialName': 'White Cement', 'qty': 18.5, 'unit': 'KG'}
    ]
}

request = factory.post(
    '/api/v1/bom', 
    data=json.dumps(payload),
    content_type='application/json',
    HTTP_X_WAREHOUSE_ID=str(wh.id)
)
force_authenticate(request, user=user)

def get_response(r):
    try:
        view = BOMViewSet.as_view({'post': 'create'})
        response = view(r)
        print("Response status:", response.status_code)
        print("Response data:", response.data)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware = HeaderTenantMiddleware(get_response)
middleware(request)
