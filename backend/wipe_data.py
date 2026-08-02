import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import (
    User, Userwarehouseaccess, Userproductaccess,
    Category, Brand, Unit, Product, Supplier, Dealer, Distributor,
    Lead, Visit, Expense, Purchaseorder, Purchaseorderitem, Purchase, Purchaseitem,
    Order, Orderitem, Stocktransaction, Bom, Bomitem
)
from django.db import transaction

def wipe_all():
    print("Wiping Test/Dummy Users and Access from db_master...")
    try:
        Userwarehouseaccess.objects.all().delete()
        dummy_user_emails = [
            'jignesh@kamla.com',
            'deepak@kamla.com',
            'rakesh@kamla.com',
            'amit@kamla.com',
            'priya@kamla.com'
        ]
        User.objects.filter(email__in=dummy_user_emails).delete()
        print("Data wiped successfully.")
    except Exception as e:
        print(f"Error wiping data: {e}")

if __name__ == "__main__":
    wipe_all()
    print("Done!")
