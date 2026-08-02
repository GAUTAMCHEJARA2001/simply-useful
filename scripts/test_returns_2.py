import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from api.views import transaction_returns
from api.models import User

user = User.objects.get(email='jignesh@kamla.com')
user.is_authenticated = True
factory = RequestFactory()
request = factory.get('/api/v1/transactions/returns')
force_authenticate(request, user=user)

try:
    response = transaction_returns(request)
    print("Status:", response.status_code)
    try:
        print("Content:", response.content)
    except:
        print("Data:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
