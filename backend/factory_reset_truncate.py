import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connections
from api.models import Company, Warehouse, User
import bcrypt

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
truncate_all('wh_nashik')
truncate_all('wh_navsari')

print("Seeding core configuration...")
c = Company.objects.create(
    id="cmo75yliq0000wesurjpett1n",
    name="Simply Useful",
    phone="9999999999",
    email="contact@simplyuseful.com",
    active=True
)

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

hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
User.objects.create(
    id="superadmin-1",
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
