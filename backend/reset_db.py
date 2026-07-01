import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction, connections
from api.models import (
    Order, Orderitem, Purchase, Purchaseitem, Purchaseorder, Purchaseorderitem,
    Stocktransaction,
    Product, Category, Brand, Supplier, Unit, Bom, Bomitem, Labour,
    Lead, LeadFollowUp, LeadStageHistory, Dealer, Distributor, Visit, Expense, Userproductaccess, Userwarehouseaccess
)

tenant_models = [
    Orderitem, Order, Purchaseitem, Purchase, Purchaseorderitem, Purchaseorder,
    Stocktransaction,
    Bomitem, Bom, Product, Category, Brand, Supplier, Unit, Labour,
    Userproductaccess, Dealer, Distributor
]

global_models = [
    Visit, Expense, LeadFollowUp, LeadStageHistory, Lead, Userwarehouseaccess
]

def clear_db(alias):
    print(f'Clearing {alias}...')
    try:
        with transaction.atomic(using=alias):
            with connections[alias].cursor() as cursor:
                for model in tenant_models:
                    table_name = model._meta.db_table
                    cursor.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
            print(f'-> Successfully cleared {alias}')
    except Exception as e:
        print(f'-> Error clearing {alias}: {e}')

def clear_global():
    print('Clearing global db_master...')
    try:
        with transaction.atomic(using='default'):
            with connections['default'].cursor() as cursor:
                for model in global_models:
                    table_name = model._meta.db_table
                    cursor.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
            print('-> Successfully cleared global db_master')
    except Exception as e:
        print(f'-> Error clearing global db: {e}')

clear_db('wh_nashik')
clear_db('wh_navsari')
clear_global()

print('ALL TESTING DATA HAS BEEN SUCCESSFULLY WIPED OUT!')
