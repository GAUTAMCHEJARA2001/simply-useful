import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Warehouse, Inventory, User
from django.db.models import Sum
from api.db_router import setup_dynamic_tenant_databases
from api.auth import JWTUser

setup_dynamic_tenant_databases()

user = User.objects.using('default').filter(email='gautam@kamla.com').first()
jwt_user = JWTUser(
    user_id=user.id,
    email=user.email,
    role=user.role,
    company_id=getattr(user, 'companyid_id', None)
)

print(f"JWT user companyId: {jwt_user.companyId}")

for wh in Warehouse.objects.filter(active=True):
    print(f"Checking {wh.name}...")
    if not wh.db_name: continue
    try:
        products_qs = Product.objects.using(wh.db_name).select_related(
            'categoryid', 'categoryid__parentid', 'brandid', 'unitid'
        )
        if jwt_user.companyId:
            products_qs = products_qs.filter(companyid_id=jwt_user.companyId)
            
        for p in products_qs:
            inv_total = Inventory.objects.using(wh.db_name).filter(productid_id=p.id).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
        count = products_qs.count()
        print(f"Success! Found {count} products.")
    except Exception as e:
        print(f"Error in {wh.name}: {e}")
