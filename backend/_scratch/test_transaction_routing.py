import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Order
from api.db_router import set_current_db

print("\n--- Testing Master Database ---")
set_current_db('default')
Order.objects.create(id="ORD-MASTER", orderid="ORD-MASTER", qty=0, grandtotal=0, companyid_id=1)
master_orders = list(Order.objects.using('default').values_list('id', flat=True))
print("Orders in Master DB:", master_orders)

print("\n--- Testing Surat Database ---")
set_current_db('wh_sur')
Order.objects.create(id="ORD-SURAT", orderid="ORD-SURAT", qty=10, grandtotal=500, companyid_id=1)
sur_orders = list(Order.objects.using('wh_sur').values_list('id', flat=True))
print("Orders in Surat DB:", sur_orders)

print("\n--- Verifying Strict Isolation ---")
set_current_db('wh_sur')
print("Active DB Context:", 'wh_sur')
# When using router, we shouldn't see ORD-MASTER in Surat DB!
router_orders = list(Order.objects.all().values_list('id', flat=True))
print("Orders found via Router:", router_orders)
if 'ORD-MASTER' in router_orders:
    print("❌ FAILED: Data leaked between DBs")
else:
    print("✅ SUCCESS: Strict tenant isolation works perfectly!")
