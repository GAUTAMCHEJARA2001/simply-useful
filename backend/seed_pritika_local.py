import os
import sys
sys.path.insert(0, os.getcwd())

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import uuid
import bcrypt
from django.utils import timezone
from api.models import User, Expense, Visit, Company
from core.models import Warehouse, Userwarehouseaccess

def seed_pritika():
    print("[SEED] Seeding Pritika Patel locally...")
    now = timezone.now()
    
    # 1. Fetch company
    company = Company.objects.using('default').filter(id='cmo75yliq0000wesurjpett1n').first()
    if not company:
        company = Company.objects.using('default').first()
    if not company:
        print("Error: No company found. Please run seed_kamla.py or migrations first.")
        return

    # 2. Create User
    password = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')
    user, created = User.objects.using('default').get_or_create(
        email='pritika@kamla.com',
        defaults={
            'id': 'user-pritika',
            'name': 'Pritika Patel',
            'role': 'SALES',
            'hashedpassword': password,
            'active': True,
            'companyid': company,
            'createdat': now,
            'updatedat': now
        }
    )
    if created:
        print(f"Created User: {user.name} ({user.email})")
    else:
        print(f"User already exists: {user.name} ({user.email})")

    # 3. Fetch NAVSARI warehouse
    wh = Warehouse.objects.using('default').filter(db_name='wh_navsari').first()
    if not wh:
        print("Error: wh_navsari warehouse not found.")
        return

    # 4. Grant warehouse access in public DB
    uwa, created = Userwarehouseaccess.objects.using('default').get_or_create(
        userid=user,
        warehouseid=wh
    )
    if created:
        print(f"Granted {user.name} access to warehouse {wh.name}")

    # 5. Create Expense in wh_navsari
    expense, created = Expense.objects.using('wh_navsari').get_or_create(
        remarks='surat working',
        defaults={
            'id': 'exp-pritika-1',
            'companyid': company,
            'soemail': user,
            'category': 'Food',
            'amount': 500.0,
            'date': timezone.now().date(),
            'status': 'PENDING',
            'createdat': now
        }
    )
    if created:
        print(f"Created local expense of INR 500 under wh_navsari for {user.name}")
    else:
        print(f"Local expense already exists under wh_navsari")

    # 6. Create Visit in wh_navsari
    visit, created = Visit.objects.using('wh_navsari').get_or_create(
        remarks='Test visit for Pritika',
        defaults={
            'id': 'visit-pritika-1',
            'companyid': company,
            'soemail': user,
            'dealername': 'AMBICA CERAMICS',
            'date': timezone.now().date(),
            'visit_status': 'PENDING',
            'createdat': now
        }
    )
    if created:
        print(f"Created local visit under wh_navsari for {user.name}")
    else:
        print(f"Local visit already exists under wh_navsari")

    print("[SEED] Local Pritika seeding complete!")

if __name__ == '__main__':
    seed_pritika()
