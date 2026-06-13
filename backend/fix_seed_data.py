import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from api.models import Product, Order, Orderitem, Purchase, Purchaseitem

DATABASES = ['wh_nashik', 'wh_navsari']

for db in DATABASES:
    print(f"Fixing db {db}")
    for p in Product.objects.using(db).all():
        if 'gold' in p.name.lower() or 'silver' in p.name.lower():
            p.bagsize = '20KG'
        elif 'filler' in p.name.lower():
            p.bagsize = '1KG'
        elif 'cement' in p.name.lower():
            p.bagsize = '50KG'
        elif 'bag' in p.name.lower():
            p.bagsize = '0KG'
        else:
            p.bagsize = '20KG'
        p.save(using=db)

    for o in Order.objects.using(db).all():
        total = sum([item.total or 0 for item in Orderitem.objects.using(db).filter(orderid=o)])
        if total:
            o.grandtotal = total
            o.save(using=db)

    for p in Purchase.objects.using(db).all():
        total = sum([item.total or 0 for item in Purchaseitem.objects.using(db).filter(purchaseid=p)])
        if total:
            p.grandtotal = total
            p.save(using=db)

print("Database seeded data fixed!")
