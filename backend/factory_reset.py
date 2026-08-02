import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from api.models import Company, Warehouse, User, Userwarehouseaccess
import bcrypt
import uuid

print("Flushing db_master...")
call_command('flush', '--no-input', database='default')

print("Seeding core configuration for Single Tenant-Based Database...")
# Create Company
c = Company.objects.create(
    id="cmo75yliq0000wesurjpett1n",
    name="Simply Useful",
    phone="9999999999",
    email="contact@simplyuseful.com",
    active=True
)

# Create Warehouses
w1 = Warehouse.objects.create(
    id=1,
    name="MAIN WAREHOUSE",
    address="Primary Distribution Center",
    active=True,
    companyid=c
)
w2 = Warehouse.objects.create(
    id=4,
    name="NAVSARI",
    address="Navsari, Gujarat",
    active=True,
    companyid=c
)
w3 = Warehouse.objects.create(
    id=5,
    name="NASHIK",
    address="Nashik, Maharashtra",
    active=True,
    companyid=c
)

# Create Superadmin
hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
admin_user = User.objects.create(
    id="superadmin-1",
    name="System Admin",
    email="admin@simplyuseful.com",
    hashedpassword=hashed,
    role="SUPERADMIN",
    active=True,
    companyid=c
)

# Grant all warehouse access
for w in [w1, w2, w3]:
    Userwarehouseaccess.objects.create(
        id=f"acc_{uuid.uuid4().hex[:12]}",
        userid=admin_user,
        warehouseid=w
    )

print("\n--- FACTORY RESET COMPLETE ---")
print("Login ID : admin@simplyuseful.com")
print("Password : admin123")
print("------------------------------")
