import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.core.management import call_command

for db in ['default', 'wh_navsari', 'wh_nashik']:
    print(f"Migrating {db}...")
    call_command('migrate', database=db)
