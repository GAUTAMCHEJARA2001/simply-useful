import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction, connections
from api.models import (
    Order, Orderitem, Purchase, Purchaseitem, Purchaseorder, Purchaseorderitem,
    Stocktransaction, Stockbatch, Inventory,
    Product, Category, Brand, Supplier, Unit, Bom, Bomitem, Labour,
    Lead, LeadFollowUp, LeadStageHistory, Dealer, Distributor, Visit, Expense, Userproductaccess, Userwarehouseaccess
)

tenant_models = [
    Orderitem, Order, Purchaseitem, Purchase, Purchaseorderitem, Purchaseorder,
    Stocktransaction, Stockbatch, Inventory,
    Bomitem, Bom, Product, Category, Brand, Supplier, Unit, Labour,
    Userproductaccess, Dealer, Distributor
]

def clear_legacy_default():
    print('Clearing legacy tenant tables from db_master...')
    with connections['default'].cursor() as cursor:
        for model in tenant_models:
            table_name = model._meta.db_table
            try:
                cursor.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
                print(f'Truncated {table_name}')
            except Exception as e:
                connections['default'].rollback()

clear_legacy_default()
print('Done!')
