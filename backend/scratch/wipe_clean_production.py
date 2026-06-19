import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django
import uuid
import bcrypt

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction, connections
from core.models import Company, User, Warehouse, Domain, Userwarehouseaccess
from api.models import (
    Category, Brand, Unit, Product, Supplier, Dealer, Distributor,
    Lead, Visit, Expense, Purchaseorder, Purchaseorderitem, Purchase, Purchaseitem,
    Order, Orderitem, Stocktransaction, Inventory, Bom, Bomitem, Userproductaccess
)
from api.db_router import setup_dynamic_tenant_databases

def main():
    print("🧹 Wiping all transaction and master data from database...")
    
    # 1. Setup connections for all warehouses
    setup_dynamic_tenant_databases()
    
    # 2. Iterate through all warehouses and wipe tenant data
    warehouses = Warehouse.objects.all()
    for wh in warehouses:
        alias = wh.db_name or wh.schema_name
        if not alias or alias == 'public':
            continue
            
        print(f"  Wiping tenant schema: {alias}...")
        try:
            with transaction.atomic(using=alias):
                # Delete items in dependency order (children first)
                Userproductaccess.objects.using(alias).all().delete()
                Bomitem.objects.using(alias).all().delete()
                Bom.objects.using(alias).all().delete()
                Inventory.objects.using(alias).all().delete()
                Stocktransaction.objects.using(alias).all().delete()
                
                Orderitem.objects.using(alias).all().delete()
                Order.objects.using(alias).all().delete()
                
                Purchaseitem.objects.using(alias).all().delete()
                Purchase.objects.using(alias).all().delete()
                Purchaseorderitem.objects.using(alias).all().delete()
                Purchaseorder.objects.using(alias).all().delete()
                
                Visit.objects.using(alias).all().delete()
                Lead.objects.using(alias).all().delete()
                Expense.objects.using(alias).all().delete()
                
                Dealer.objects.using(alias).all().delete()
                Distributor.objects.using(alias).all().delete()
                Supplier.objects.using(alias).all().delete()
                Product.objects.using(alias).all().delete()
                Brand.objects.using(alias).all().delete()
                Category.objects.using(alias).all().delete()
                Unit.objects.using(alias).all().delete()
                
                print(f"  Successfully wiped schema: {alias}")
        except Exception as e:
            print(f"  Error wiping schema {alias}: {e}")
            
    # 3. Clean up global users and access links in public schema
    print("  Cleaning up global users...")
    try:
        with transaction.atomic(using='default'):
            # Delete all warehouse access links
            Userwarehouseaccess.objects.all().delete()
            
            # Find or create Kamla Enterprises company
            company = Company.objects.filter(name='Kamla Enterprises').first()
            if not company:
                company = Company.objects.create(
                    id='cmpwp1h8v0000sscdshw8thbl',
                    name='Kamla Enterprises',
                    skuprefix='KMLA',
                    active=True,
                    stockmethod='FIFO'
                )
            
            # Delete all users EXCEPT super@kamla.com
            User.objects.exclude(email='super@kamla.com').delete()
            
            # Find or create the superadmin user
            super_user = User.objects.filter(email='super@kamla.com').first()
            hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
            
            if not super_user:
                super_user = User.objects.create(
                    id='c' + uuid.uuid4().hex[:23],
                    email='super@kamla.com',
                    name='Kamla Super Admin',
                    hashedpassword=hashed_password,
                    role='SUPERADMIN',
                    active=True,
                    companyid=company
                )
                print(f"  Created Superadmin User: super@kamla.com")
            else:
                super_user.hashedpassword = hashed_password
                super_user.active = True
                super_user.role = 'SUPERADMIN'
                super_user.companyid = company
                super_user.save()
                print(f"  Reset Superadmin User: super@kamla.com")
                
            # Recreate access links for superadmin to all warehouses
            for wh in warehouses:
                Userwarehouseaccess.objects.create(
                    userid=super_user,
                    warehouseid=wh
                )
                print(f"  Linked superadmin to warehouse: {wh.name}")
                
            print("  Global database cleanup complete.")
    except Exception as e:
        print(f"  Error cleaning up global: {e}")

if __name__ == '__main__':
    main()
