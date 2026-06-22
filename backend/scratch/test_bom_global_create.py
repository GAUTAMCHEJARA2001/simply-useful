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

# 2. Setup database configuration connections
from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

# Clear any existing BOMs for FG-GOLD in wh_nashik first
Bom.objects.using('wh_nashik').filter(productcode='FG-GOLD').delete()

# Get finished good product from wh_nashik
product = Product.objects.using('wh_nashik').filter(productcode='FG-GOLD').first()
if not product:
    product = Product.objects.using('wh_nashik').first()

# Get a raw material product
raw_material = Product.objects.using('wh_nashik').exclude(id=product.id).first()

# 3. Payload targeting GLOBAL view (form.assignedWarehouse will not be present)
payload = {
    'name': 'BOM Global creation test',
    'productId': product.id if product else 'invalid_id',
    'outputQuantity': 1,
    'items': [
        {
            'productId': raw_material.id if raw_material else 'some_id',
            'productName': raw_material.name if raw_material else 'Raw Material A',
            'quantity': 15.0,
            'unit': 'KG'
        }
    ]
}

factory = RequestFactory()
request = factory.post(
    '/api/v1/bom', 
    data=json.dumps(payload),
    content_type='application/json',
    HTTP_X_WAREHOUSE_ID='GLOBAL'  # Explicitly simulate global view request!
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
