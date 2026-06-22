import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from core.models import User, Warehouse
from api.models import Product
from api.views import transaction_productions
from core.middleware import HeaderTenantMiddleware

# Find a valid superadmin user
user = User.objects.filter(role='SUPERADMIN').first()
if not user:
    user = User.objects.first()
if user:
    user.is_authenticated = True
print("Using user:", user.email if user else "None")

# Find a product in database
# Note: since products are stored in tenant database wh_nashik or wh_navsari, 
# let's resolve from wh_nashik
wh = Warehouse.objects.filter(db_name='wh_nashik').first()
if not wh:
    wh = Warehouse.objects.first()
print("Using warehouse:", wh.name, "db:", wh.db_name)

product = Product.objects.using(wh.db_name).filter(productcode='FG-GOLD').first()
if not product:
    product = Product.objects.using(wh.db_name).first()
print("Using product:", product.name if product else "None", "ID:", product.id if product else "None")

factory = RequestFactory()
payload = {
    'productId': product.id if product else 'invalid_id',
    'warehouseId': wh.id,
    'quantity': 10,
    'remarks': 'Test production'
}

request = factory.post(
    '/api/v1/transactions/productions', 
    data=json.dumps(payload),
    content_type='application/json',
    HTTP_X_WAREHOUSE_ID=str(wh.id)
)
force_authenticate(request, user=user)

def get_response(r):
    try:
        response = transaction_productions(r)
        print("Response status:", response.status_code)
        print("Response data:", response.data)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware = HeaderTenantMiddleware(get_response)
middleware(request)
