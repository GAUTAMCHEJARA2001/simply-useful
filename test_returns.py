import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import RequestFactory
from api.views import transaction_returns
from api.models import User

user = User.objects.get(email='jignesh@kamla.com')
factory = RequestFactory()
request = factory.get('/api/v1/transactions/returns')
request.user = user

response = transaction_returns(request)
print("Status:", response.status_code)
print("Content:", response.content)
