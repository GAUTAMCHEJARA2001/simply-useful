import os
import django
import uuid
import bcrypt

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Company, User, Warehouse

def seed():
    print("🌱 Seeding Kamla Enterprises database...")
    
    # 1. Create Company
    company, created = Company.objects.get_or_create(
        name='Kamla Enterprises',
        defaults={
            'id': 'cmpwp1h8v0000sscdshw8thbl',
            'skuprefix': 'KMLA',
            'active': True,
            'stockmethod': 'FIFO'
        }
    )
    if created:
        print(f"🏢 Created Company: {company.name}")
    else:
        print(f"🏢 Company already exists: {company.name}")
        
    # 2. Create Superadmin User
    hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    
    user, created = User.objects.get_or_create(
        email='super@kamla.com',
        defaults={
            'id': 'c' + uuid.uuid4().hex[:23],
            'name': 'Kamla Super Admin',
            'hashedpassword': hashed_password,
            'role': 'SUPERADMIN',
            'active': True,
            'companyid': company
        }
    )
    if created:
        print(f"👤 Created Superadmin User: {user.email}")
    else:
        user.hashedpassword = hashed_password
        user.save()
        print(f"👤 Superadmin User already exists: {user.email} (Password reset to admin123)")
        
    # 3. Create MAIN Warehouse
    warehouse, created = Warehouse.objects.get_or_create(
        name='MAIN',
        companyid=company,
        defaults={
            'active': True,
            'location': 'Main Facility'
        }
    )
    if created:
        print(f"🏗️ Created MAIN Warehouse")
    else:
        print(f"🏗️ MAIN Warehouse already exists")
        
    print("🏁 Database successfully seeded!")

if __name__ == '__main__':
    seed()
