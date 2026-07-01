import os, django, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from api.models import Order
from django.db import connections

for db in connections:
    try:
        qs = Order.objects.using(db).filter(orderid='ORD-976290')
        if qs.exists():
            o = qs.first()
            print(f'Found in DB: {db}')
            print('Status:', o.status)
            for i in o.orderitem_set.using(db).all():
                print(f'Item: {i.productid.name if i.productid else i.productid_id} Qty: {i.qty} Sent: {i.sentqty}')
            break
    except Exception as e:
        pass
else:
    print('Not found')
