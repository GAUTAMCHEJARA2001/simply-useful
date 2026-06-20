import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from api.views import VisitViewSet, ExpenseViewSet, OrderViewSet
from core.middleware import HeaderTenantMiddleware

factory = RequestFactory()
request = factory.get('/api/v1/visits/', HTTP_X_WAREHOUSE_ID='GLOBAL')
request.user = type('User', (), {'role': 'SALES', 'email': 'pritika@kamla.com', 'is_authenticated': True, 'id': 2})()

def get_response(r):
    view = VisitViewSet.as_view({'get': 'list'}, permission_classes=[])
    try:
        response = view(r)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

middleware = HeaderTenantMiddleware(get_response)
response = middleware(request)
if response:
    print(response.data)
