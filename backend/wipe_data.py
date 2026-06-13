import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

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
    print("Wiping Global Data (CRM, Visits, Expenses)...")
    try:
        Lead.objects.using('default').all().delete()
        Visit.objects.using('default').all().delete()
        Expense.objects.using('default').all().delete()
        
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
        if wh.db_name:
            wipe_tenant(wh.db_name)
    print("Done!")
