import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Warehouse, Inventory
from api.db_router import setup_dynamic_tenant_databases

setup_dynamic_tenant_databases()

for wh in Warehouse.objects.filter(active=True):
    if not wh.db_name:
        continue
    
    print(f"Syncing inventory for {wh.name}...")
    products = Product.objects.using(wh.db_name).all()
    count = 0
    for p in products:
        if p.openingstock is not None and p.openingstock > 0:
            # Check if inventory exists
            inv, created = Inventory.objects.using(wh.db_name).get_or_create(
                productid=p,
                warehouseid=wh,
                defaults={'quantity': p.openingstock, 'avgcost': p.rate or 0.0}
            )
            if not created and inv.quantity == 0:
                 inv.quantity = p.openingstock
                 inv.save(using=wh.db_name)
                 count += 1
            elif created:
                 count += 1
                 
    print(f"  -> Synced inventory for {count} products in {wh.name}.")
