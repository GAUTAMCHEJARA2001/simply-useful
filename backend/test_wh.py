import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from rest_framework.test import APIClient
from api.models import User
from api.auth import generate_tokens

u = User.objects.filter(role__in=['ADMIN', 'SUPERADMIN', 'INVENTORY']).first()

if u:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + generate_tokens(str(u.id), u.email, u.role)[0])
    resp = client.get('/api/v1/masters/warehouses')
    print('User Role:', u.role)
    print('Warehouses response:', resp.content)
else:
    print('User not found')
