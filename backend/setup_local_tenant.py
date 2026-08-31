import os
import django
import bcrypt
import uuid
from django.utils import timezone

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from core.models import Company, Warehouse, User, Userwarehouseaccess

def setup_local_tenant():
    print("1. Running database migrations to create/verify public schema tables & indexes...")
    call_command('migrate', '--noinput')

    print("1.5 Resetting database sequences to avoid UniqueViolation errors...")
    from io import StringIO
    from django.db import connection
    out = StringIO()
    call_command('sqlsequencereset', 'api', 'core', stdout=out)
    sql = out.getvalue()
    with connection.cursor() as cursor:
        for s in sql.split(';'):
            if s.strip():
                cursor.execute(s)

    print("\n2. Creating Company (Tenant)...")
    company_id = "cmo75yliq0000wesurjpett1n"
    company, created = Company.objects.get_or_create(
        id=company_id,
        defaults={
            'name': "Simply Useful",
            'skuprefix': "SU-",
            'active': True,
            'stockmethod': "FIFO",
            'settings_json': "{}"
        }
    )
    if not created:
        print(f"   -> Company '{company.name}' already exists (id: {company.id}).")
    else:
        print(f"   -> Created Company '{company.name}' (id: {company.id}).")

    print("\n3. Creating Warehouses for Company...")
    warehouses_data = [
        {"name": "MAIN WAREHOUSE", "location": "Main Facility, Head Office"},
        {"name": "NAVSARI", "location": "Navsari, Gujarat"},
        {"name": "NASHIK", "location": "Nashik, Maharashtra"}
    ]
    created_warehouses = []
    for wh_data in warehouses_data:
        wh, wh_created = Warehouse.objects.get_or_create(
            name=wh_data["name"],
            companyid=company,
            defaults={
                'active': True,
                'location': wh_data["location"]
            }
        )
        created_warehouses.append(wh)
        status_text = "Created" if wh_created else "Existing"
        print(f"   -> [{status_text}] Warehouse: {wh.name} (id: {wh.id})")

    print("\n4. Creating Superadmin User...")
    admin_email = "admin@simplyuseful.com"
    admin_password = "admin123"
    hashed_pw = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    admin_user, admin_created = User.objects.get_or_create(
        email=admin_email,
        defaults={
            'id': 'c' + uuid.uuid4().hex[:23],
            'name': "System Admin",
            'hashedpassword': hashed_pw,
            'role': "SUPERADMIN",
            'active': True,
            'companyid': company
        }
    )
    if not admin_created:
        admin_user.hashedpassword = hashed_pw
        admin_user.companyid = company
        admin_user.save()
        print(f"   -> Updated password & company for existing user: {admin_user.email}")
    else:
        print(f"   -> Created superadmin user: {admin_user.email}")

    print("\n5. Assigning Warehouse Access to Superadmin...")
    for wh in created_warehouses:
        access, access_created = Userwarehouseaccess.objects.get_or_create(
            userid=admin_user,
            warehouseid=wh
        )
        status_text = "Granted" if access_created else "Existing"
        print(f"   -> [{status_text}] Access to {wh.name}")

    print("\n" + "="*50)
    print("=== LOCAL TENANT INITIALIZATION COMPLETE ===")
    print("="*50)
    print(f"Company ID     : {company.id}")
    print(f"Company Name   : {company.name}")
    print(f"Warehouses     : {', '.join([w.name for w in created_warehouses])}")
    print(f"Login Email    : {admin_email}")
    print(f"Login Password : {admin_password}")
    print("="*50)

if __name__ == "__main__":
    setup_local_tenant()
