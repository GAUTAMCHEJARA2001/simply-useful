import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User
from core.models import Warehouse, Userwarehouseaccess
from api.db_router import set_current_db

user = User.objects.using('default').filter(email='pritika@kamla.com').first()
if not user:
    print("User not found")
    exit()

print(f"User ID: {user.id}")
print(f"Warehouse Access in default DB: {Userwarehouseaccess.objects.filter(userid=user).count()}")

for wh in Warehouse.objects.filter(active=True):
    if not wh.db_name:
        continue
    set_current_db(wh.db_name)
    from api.models import Userproductaccess
    count = Userproductaccess.objects.using(wh.db_name).filter(userid=user).count()
    print(f"[{wh.name}] Product Access count: {count}")
    if count > 0:
        accesses = Userproductaccess.objects.using(wh.db_name).filter(userid=user)
        for access in accesses:
            print(f"  - product_id: {access.productid_id}, category_id: {access.categoryid_id}, brand_id: {access.brandid_id}")
