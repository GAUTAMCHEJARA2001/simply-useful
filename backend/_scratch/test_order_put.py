import os
import django
import sys
import traceback

sys.path.append(r'd:\cost 2\simply-useful\simply-useful\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Order, User
from api.auth import JWTUser, generate_tokens
from rest_framework.test import APIRequestFactory
from api.views import OrderViewSet

def test_order_update():
    try:
        # Get target order
        order = Order.objects.filter(orderid='ORD-541458').first()
        if not order:
            print("No orders in database!")
            return
            
        print(f"Testing with order orderId: {order.orderid}, id: {order.id}")
        
        # Get matching user
        user_obj = User.objects.filter(email=order.soemail_id).first()
        if not user_obj:
            user_obj = User.objects.first()
            
        user = JWTUser(
            user_id=user_obj.id,
            email=user_obj.email,
            role=user_obj.role,
            company_id=order.companyid_id,
            name=user_obj.name
        )
        
        # Exact payload sent by the frontend
        payload = {
            "items": [
                {
                    "productId": "ccf334584013d48ddb4ad989",
                    "qty": 5,
                    "price": 450.0,
                    "total": 2250.0,
                    "itemRemark": "BannerCapTShirt"
                }
            ],
            "narration": "BannerCapTShirt",
            "grandTotal": 2250.0,
            "partyName": order.partyname,
            "distributor": order.distributor,
            "warehouseId": 1
        }
        
        access_token, _ = generate_tokens(user.id, user.email, user.role, user.companyId)
        
        factory = APIRequestFactory()
        view = OrderViewSet.as_view({'put': 'update_items'})
        
        # Put request with order.orderid
        request = factory.put(
            f'/api/v1/sales/{order.orderid}/items',
            payload,
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        
        print("Calling update_items detail action...")
        response = view(request, pk=order.orderid)
        
        print("Status code:", response.status_code)
        if response.status_code >= 400:
            print("Response Data:", getattr(response, 'data', None))
            print("Response Rendered Content:", response.render().content.decode('utf-8') if hasattr(response, 'render') else None)
        else:
            print("Success! Response:", response.data)
            
    except Exception as e:
        print("CRASHED!")
        traceback.print_exc()

if __name__ == '__main__':
    test_order_update()
