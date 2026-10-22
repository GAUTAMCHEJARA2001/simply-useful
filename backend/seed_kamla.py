import os
import django
import uuid
import bcrypt

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Company, User, Warehouse
from django.utils import timezone

def seed():
    try:
        print("[SEED] Seeding Kamla Enterprises database...")
        now = timezone.now()
        
        # 1. Create or Find Company safely by ID or Name
        company = Company.objects.filter(id='cmpwp1h8v0000sscdshw8thbl').first()
        if not company:
            company = Company.objects.filter(name__iexact='Kamla Enterprises').first()
        if not company:
            company = Company.objects.filter(name__icontains='Kamla').first()
        if not company:
            company = Company.objects.create(
                id='cmpwp1h8v0000sscdshw8thbl',
                name='KAMLA CONCHEM PVT LTD',
                skuprefix='KMLA',
                active=True,
                stockmethod='FIFO',
                createdat=now,
                updatedat=now
            )
            print(f"Created Company: {company.name}")
        else:
            print(f"Company already exists: {company.name} ({company.id})")
            
        # 2. Create Superadmin User safely
        hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        user = User.objects.filter(email='super@kamla.com').first()
        if not user:
            user = User.objects.create(
                id='c' + uuid.uuid4().hex[:23],
                email='super@kamla.com',
                name='Kamla Super Admin',
                hashedpassword=hashed_password,
                role='SUPERADMIN',
                active=True,
                companyid=company,
                createdat=now,
                updatedat=now
            )
            print(f"Created Superadmin User: {user.email}")
        else:
            user.hashedpassword = hashed_password
            user.updatedat = now
            user.save(update_fields=['hashedpassword', 'updatedat'])
            print(f"Superadmin User already exists: {user.email} (Password reset to admin123)")
            
        # 3. Create MAIN Warehouse safely
        warehouse = Warehouse.objects.filter(name='MAIN', companyid=company).first()
        if not warehouse:
            warehouse = Warehouse.objects.create(
                name='MAIN',
                companyid=company,
                active=True,
                location='Main Facility',
            )
            print(f"Created MAIN Warehouse")
        else:
            print(f"MAIN Warehouse already exists")
            
        print("Database successfully seeded!")
    except Exception as e:
        print(f"[WARN] Non-fatal seed error (bypassing to allow server to boot): {e}")

if __name__ == '__main__':
    seed()
