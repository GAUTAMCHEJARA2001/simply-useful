import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from core.models import User

c = Client()
user = User.objects.filter(role='SUPERADMIN').first()
c.force_login(user)

data = {
    'partyType': 'DEALER',
    'partyName': 'Test Dealer 2',
    'cityOrArea': 'Test City 2',
    'address': 'Test Address 2',
    'phone': '0987654321',
    'contactPerson': 'Test Person 2',
    'extendedData': json.dumps({"bankName": "HDFC", "faxNo": "12345"}),
    'gstNumber': 'TESTGST'
}

response = c.post('/api/v1/onboarding/', data)
print(response.json())

from api.models import PartyOnboardingRequest
latest = PartyOnboardingRequest.objects.order_by('-created_at').first()
print("Saved extended_data:", latest.extended_data)
print("Saved gst:", latest.gst_number)
