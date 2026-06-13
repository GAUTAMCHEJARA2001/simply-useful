import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from api.models import Order, Warehouse
from api.db_router import set_current_db

# Create a dummy order in NAVSARI (db_name=wh_navsari)
navsari = Warehouse.objects.get(name='NAVSARI')
nashik = Warehouse.objects.get(name='NASHIK')

set_current_db(navsari.db_name)
o = Order.objects.create(id='test_move_1', orderid='ORD-TEST-1', date='2026-06-12', partytype='Dealer', partyname='Test', distributor='Test', status='Pending', grandtotal=100, soemail_id='admin@test.com', companyid_id='cmo75yliq0000wesurjpett1n')

print('Order created in Navsari:', Order.objects.using(navsari.db_name).filter(id='test_move_1').exists())

# Move it to Nashik
old_db = o._state.db
o.save(using=nashik.db_name)
Order.objects.using(old_db).filter(id=o.id).delete()

print('Order in Navsari after move:', Order.objects.using(navsari.db_name).filter(id='test_move_1').exists())
print('Order in Nashik after move:', Order.objects.using(nashik.db_name).filter(id='test_move_1').exists())

# Cleanup
Order.objects.using(nashik.db_name).filter(id='test_move_1').delete()
