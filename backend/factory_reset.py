import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import Company, Warehouse, User
import bcrypt
import uuid

print("Flushing db_master...")
call_command('flush', '--no-input', database='default')
print("Flushing wh_nashik...")
call_command('flush', '--no-input', database='wh_nashik')
print("Flushing wh_navsari...")
call_command('flush', '--no-input', database='wh_navsari')

print("Seeding core configuration...")
# Create Company
c = Company.objects.create(
    id="cmo75yliq0000wesurjpett1n",
    name="Simply Useful",
    phone="9999999999",
    email="contact@simplyuseful.com",
    active=True
)

# Create Warehouses
Warehouse.objects.create(
    id=4,
    name="NAVSARI",
    address="Navsari, Gujarat",
    active=True,
    db_name="wh_navsari"
)
Warehouse.objects.create(
    id=5,
    name="NASHIK",
    address="Nashik, Maharashtra",
    active=True,
    db_name="wh_nashik"
)

# Create Superadmin
hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
User.objects.create(
    id=str(uuid.uuid4())[:25],
    name="System Admin",
    email="admin@simplyuseful.com",
    hashedpassword=hashed,
    role="SUPERADMIN",
    active=True,
    companyid=c
)

print("\n--- FACTORY RESET COMPLETE ---")
print("Login ID : admin@simplyuseful.com")
print("Password : admin123")
print("------------------------------")
