import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Warehouse, Inventory, User
from django.db.models import Sum
from api.db_router import setup_dynamic_tenant_databases

setup_dynamic_tenant_databases()

user = User.objects.using('default').filter(email='gautam@kamla.com').first()
print(f"User companyId attr: {getattr(user, 'companyId', 'MISSING')}")
print(f"User companyid_id attr: {getattr(user, 'companyid_id', 'MISSING')}")

try:
    for wh in Warehouse.objects.filter(active=True):
        print(f"Checking {wh.name}")
        if not wh.db_name: continue
        products_qs = Product.objects.using(wh.db_name).all()
        # This is where the code might fail:
        if getattr(user, 'companyId', None):
             print("Has companyId")
             products_qs = products_qs.filter(companyid_id=user.companyId)
        
        count = products_qs.count()
        print(f"Found {count} products in {wh.db_name}")
except Exception as e:
    import traceback
    traceback.print_exc()

