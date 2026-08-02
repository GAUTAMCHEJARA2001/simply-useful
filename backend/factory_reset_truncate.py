import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connections
from api.models import Company, Warehouse, User, Userwarehouseaccess
import bcrypt
import uuid

def truncate_all(alias):
    print(f"Truncating {alias}...")
    with connections[alias].cursor() as c:
        c.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        """)
        tables = [row[0] for row in c.fetchall()]
        if tables:
            c.execute(f"TRUNCATE TABLE {', '.join(f'\"{t}\"' for t in tables)} CASCADE;")

truncate_all('default')

print("Seeding core configuration for Single Tenant-Based Database...")
c = Company.objects.create(
    id="cmo75yliq0000wesurjpett1n",
    name="Simply Useful",
    phone="9999999999",
    email="contact@simplyuseful.com",
    active=True
)

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
