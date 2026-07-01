import os
import sys
import django
import time

sys.path.append(r'd:\cost 2\simply-useful\simply-useful\simply-useful\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from api.views import transaction_sales
from api.models import User

# Find admin user
admin = User.objects.filter(is_superuser=True).first() or User.objects.first()

rf = RequestFactory()
request = rf.get('/api/transactions/sales')
request.user = admin

start = time.time()
response = transaction_sales(request)
end = time.time()

print(f"Status Code: {response.status_code}")
print(f"Time Taken: {end - start:.2f}s")
if response.status_code != 200:
    print(response.content)
