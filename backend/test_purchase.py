import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from api.views import transaction_purchases
from core.models import User, Company
from api.models import Product, Supplier
import json

factory = APIRequestFactory()

user = User.objects.first()
company = Company.objects.first()
if user:
    user.companyid_id = company.id
    user.save()
product = Product.objects.first()
supplier = Supplier.objects.first()

data = {
    'supplierId': supplier.id if supplier else 'test_sup',
    'vendorName': 'Test Vendor',
    'items': [
        {
            'productId': product.id if product else 'test_prod',
            'quantity': 10,
            'rate': 100,
            'tax_percent': 18
        }
    ]
}

request = factory.post('/api/v1/transactions/purchases', data=json.dumps(data), content_type='application/json')
force_authenticate(request, user=user)

response = transaction_purchases(request)
print("Response STATUS:", response.status_code)
print("Response DATA:", response.data)
