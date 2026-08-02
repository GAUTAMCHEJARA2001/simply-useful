import os
import sys
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Warehouse, Userwarehouseaccess, Expense, Visit, Company
import bcrypt

def seed_pritika():
    now = timezone.now()
    
    # 1. Fetch Company
    company = Company.objects.filter(id='cmo75yliq0000wesurjpett1n').first()
    if not company:
        company = Company.objects.first()
    if not company:
        print("Error: No company found. Please run setup_local_tenant.py first.")
        return

    # 2. Get or create user
    hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
    user, created = User.objects.get_or_create(
        email='pritika@kamla.com',
        defaults={
            'id': 'user-pritika-1',
            'name': 'Pritika Sales',
            'role': 'SALES_OFFICER',
            'hashedpassword': hashed,
            'active': True,
            'companyid': company
        }
    )
    if created:
        print(f"Created user: {user.name} ({user.email})")
    else:
        print(f"User already exists: {user.name} ({user.email})")

    # 3. Fetch NAVSARI warehouse
    wh = Warehouse.objects.filter(name__iexact='NAVSARI').first()
    if not wh:
        wh = Warehouse.objects.first()
    if not wh:
        print("Error: NAVSARI warehouse not found.")
        return

    # 4. Grant warehouse access
    uwa, created = Userwarehouseaccess.objects.get_or_create(
        userid=user,
        warehouseid=wh
    )
    if created:
        print(f"Granted {user.name} access to warehouse {wh.name}")

    # 5. Create Expense in single DB
    expense, created = Expense.objects.get_or_create(
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
        print(f"Created local expense of INR 500 for {user.name}")
    else:
        print(f"Local expense already exists")

    # 6. Create Visit in single DB
    visit, created = Visit.objects.get_or_create(
        remarks='Test visit for Pritika',
        defaults={
            'id': 'visit-pritika-1',
            'companyid': company,
            'soemail': user,
            'customername': 'Kamla Store #1',
            'visitdate': timezone.now().date(),
            'purpose': 'Regular Followup',
            'createdat': now
        }
    )
    if created:
        print(f"Created local visit for {user.name}")
    else:
        print(f"Local visit already exists")

    print("\n--- SEED PRITIKA COMPLETE ---")
    print("Login Email    : pritika@kamla.com")
    print("Password       : admin123")
    print("-----------------------------")

if __name__ == '__main__':
    seed_pritika()
