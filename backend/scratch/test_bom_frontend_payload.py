import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from core.models import User, Warehouse
from api.models import Product, Bom
from api.views import BOMViewSet
from core.middleware import HeaderTenantMiddleware

# 1. User
user = User.objects.filter(role='SUPERADMIN').first()
if not user:
    user = User.objects.first()
if user:
    user.is_authenticated = True

# 2. Warehouse
wh = Warehouse.objects.filter(db_name='wh_nashik').first()
if not wh:
    wh = Warehouse.objects.first()

# Delete any existing BOMs to prevent the 400 validation duplicate check from firing
from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()
Bom.objects.using(wh.db_name).filter(productcode='FG-GOLD').delete()

# Get finished good product
product = Product.objects.using(wh.db_name).filter(productcode='FG-GOLD').first()
if not product:
    product = Product.objects.using(wh.db_name).first()

# Get a raw material product
raw_material = Product.objects.using(wh.db_name).exclude(id=product.id).first()

# 3. Payload with exact frontend format
payload = {
    'name': 'BOM Frontend format test',
    'productId': product.id if product else 'invalid_id',
    'outputQuantity': 1,
    'items': [
        {
            'productId': raw_material.id if raw_material else 'some_id',
            'productName': raw_material.name if raw_material else 'Raw Material A',
            'quantity': 25.5,
            'unit': 'KG'
        }
    ]
}

factory = RequestFactory()
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
