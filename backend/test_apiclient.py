import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from core.models import User

client = APIClient()
user = User.objects.filter(role='SUPERADMIN').first()
client.force_authenticate(user=user)

data = {
    'partyType': 'DEALER',
    'partyName': 'Test Dealer APIClient',
    'cityOrArea': 'Test City APIClient',
    'address': 'Test Address APIClient',
    'phone': '1111111111',
    'contactPerson': 'Test Person APIClient',
    'extendedData': json.dumps({"bankName": "HDFC", "faxNo": "54321"}),
    'gstNumber': 'TESTGSTCLIENT'
}

response = client.post('/api/v1/onboarding', data, format='multipart')
print("Response status:", response.status_code)
print("Response json:", response.json())

from api.models import PartyOnboardingRequest
latest = PartyOnboardingRequest.objects.order_by('-created_at').first()
print("Saved extended_data:", latest.extended_data)
print("Saved gst:", latest.gst_number)
