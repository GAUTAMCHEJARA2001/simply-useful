import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import User
from api.views import reports_aggregate_stock

factory = APIRequestFactory()
user = User.objects.first()

request = factory.get('/api/v1/reports/aggregate-stock')
force_authenticate(request, user=user)

try:
    response = reports_aggregate_stock(request)
    if hasattr(response, 'data'):
        if isinstance(response.data, dict) and 'data' in response.data:
            print(response.data['data'][:2])
        else:
            print(response.data[:2])
    else:
        print(response.content)
except Exception as e:
    print(e)
