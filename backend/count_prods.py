import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from api.models import Warehouse, Product

print("Counting products in warehouses...")
for wh in Warehouse.objects.filter(active=True):
    if not wh.db_name:
        continue
    try:
        count = Product.objects.using(wh.db_name).count()
        print(f"Warehouse {wh.db_name}: {count} products")
    except Exception as e:
        print(f"Warehouse {wh.db_name}: ERROR {e}")
