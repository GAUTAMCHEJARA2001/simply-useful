import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import PartyOnboardingRequest

# Update string URLs to empty JSON lists
for req in PartyOnboardingRequest.objects.all():
    if isinstance(req.doc_signed_form, str):
        req.doc_signed_form = []
        req.save()
print("Fixed doc_signed_form")
