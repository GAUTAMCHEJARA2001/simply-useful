import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from core.models import User

c = Client()
user = User.objects.filter(role='SUPERADMIN').first()
c.force_login(user)

data = {
    'partyType': 'DEALER',
    'partyName': 'Test Dealer',
    'cityOrArea': 'Test City',
    'address': 'Test Address',
    'phone': '1234567890',
    'contactPerson': 'Test Person',
    'extendedData': '{"bankName": "HDFC", "faxNo": "12345"}'
}

response = c.post('/api/v1/onboarding/', data)
print(response.status_code)
print(response.json())

from api.models import PartyOnboardingRequest
latest = PartyOnboardingRequest.objects.order_by('-created_at').first()
print("Saved extended_data:", latest.extended_data)
