import os
import django
import sys

# Setup django environment
sys.path.append(r'd:\cost 2\simply-useful\simply-useful\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Purchase, Purchaseitem, Supplier, Product
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from api.views import transaction_purchases
from api.auth import JWTUser

def test_post():
    try:
        # Create a mock user matching the custom JWT authentication
        user = JWTUser(
            user_id='superadmin-1',
            email='admin@simplyuseful.com',
            role='SUPERADMIN',
            company_id='cmo75yliq0000wesurjpett1n',
            name='System Admin'
        )
            
        supplier = Supplier.objects.first()
        product = Product.objects.first()
        
        if not supplier or not product:
            print(f"Supplier: {supplier}, Product: {product}")
            print("Missing seed data!")
            return

        payload = {
            "supplier_id": supplier.id,
            "warehouse_id": "cmo75yliq0002wesurjpett1n",
            "challanNumber": "CH-12345",
            "vehicle_number": "HR-26-A-9999",
            "lineItems": [
                {
                    "productId": product.id,
                    "quantity": 10,
                    "rate": 150.0,
                    "tax_percent": 18.0,
                    "remark": "Test remark"
                }
            ]
        }
        
        from api.auth import generate_tokens
        access_token, _ = generate_tokens(user.id, user.email, user.role, user.companyId)
        
        factory = APIRequestFactory()
        request = factory.post('/api/v1/transactions/purchases', payload, format='json', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        print("Executing transaction_purchases POST view...")
        response = transaction_purchases(request)
        print("Status code:", response.status_code)
        print("Response data:", response.data)
        
        # Verify db insert
        print("Current Purchase count:", Purchase.objects.count())
        print("Current Purchaseitem count:", Purchaseitem.objects.count())
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_post()
