import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import (
    User, Userwarehouseaccess, Userproductaccess,
    Category, Brand, Unit, Product, Supplier, Dealer, Distributor,
    Lead, Visit, Expense, Purchaseorder, Purchaseorderitem, Purchase, Purchaseitem,
    Order, Orderitem, Stocktransaction, Inventory, Bom, Bomitem
)
from django.db import transaction

def wipe_tenant(db_name):
    print(f"Wiping Tenant Data for {db_name}...")
    try:
        with transaction.atomic(using=db_name):
            # CRM / Leads
            Lead.objects.using(db_name).all().delete()
            Visit.objects.using(db_name).all().delete()
            Expense.objects.using(db_name).all().delete()

            # Transactions
            Orderitem.objects.using(db_name).all().delete()
            Order.objects.using(db_name).all().delete()
            Purchaseitem.objects.using(db_name).all().delete()
            Purchase.objects.using(db_name).all().delete()
            Stocktransaction.objects.using(db_name).all().delete()
            Inventory.objects.using(db_name).all().delete()
            
            # Masters
            Bomitem.objects.using(db_name).all().delete()
            Bom.objects.using(db_name).all().delete()
            Dealer.objects.using(db_name).all().delete()
            Distributor.objects.using(db_name).all().delete()
            Supplier.objects.using(db_name).all().delete()
            Userproductaccess.objects.using(db_name).all().delete()
            Product.objects.using(db_name).all().delete()
            Brand.objects.using(db_name).all().delete()
            Category.objects.using(db_name).all().delete()
            Unit.objects.using(db_name).all().delete()
            print(f"Tenant {db_name} wiped successfully.")
    except Exception as e:
        print(f"Error wiping {db_name}: {e}")

def wipe_global():
    print("Wiping Global Data (Users, Userwarehouseaccess)...")
    try:
        Userwarehouseaccess.objects.using('default').all().delete()
        
        # Delete only the dummy users we created
        dummy_user_emails = [
            'jignesh@kamla.com',
            'deepak@kamla.com',
            'rakesh@kamla.com',
            'amit@kamla.com',
            'priya@kamla.com'
        ]
        User.objects.using('default').filter(email__in=dummy_user_emails).delete()
        print("Global data wiped successfully.")
    except Exception as e:
        print(f"Error wiping global: {e}")

if __name__ == "__main__":
    wipe_global()
    from api.models import Warehouse
    for wh in Warehouse.objects.filter(active=True):
        alias = wh.db_name or wh.schema_name
        if alias:
            wipe_tenant(alias)
    print("Done!")
