import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User

user = User.objects.using('default').filter(email='gautam@kamla.com').first()
try:
    print(user.companyId)
except Exception as e:
    print(f"Exception: {type(e).__name__} - {e}")
