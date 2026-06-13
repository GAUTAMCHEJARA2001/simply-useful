import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Warehouse, Orderitem, Product

# We want to map any OrderItem.productid_id to the correct product in its OWN database.
# If an OrderItem's productid_id doesn't exist in the current DB, we search all DBs for it to find its productcode,
# then we find the product in the current DB with that productcode and update the OrderItem!

for wh in Warehouse.objects.filter(active=True):
    if not wh.db_name: continue
    
    print(f"Checking DB: {wh.db_name}")
    items = Orderitem.objects.using(wh.db_name).all()
    for item in items:
        # Check if product exists in this DB
        p = Product.objects.using(wh.db_name).filter(id=item.productid_id).first()
        if not p:
            print(f"  OrderItem {item.id} points to missing product {item.productid_id}")
            # It's missing! Find the productcode from ANY database
            code = None
            for other_wh in Warehouse.objects.filter(active=True):
                if not other_wh.db_name: continue
                match = Product.objects.using(other_wh.db_name).filter(id=item.productid_id).first()
                if match:
                    code = match.productcode
                    break
            
            if code:
                # Find product with this code in the CURRENT database
                correct_p = Product.objects.using(wh.db_name).filter(productcode=code).first()
                if correct_p:
                    print(f"    -> Mapped to local product {correct_p.id} via code {code}")
                    item.productid_id = correct_p.id
                    item.save(using=wh.db_name)
                else:
                    print(f"    -> CRITICAL: Product with code {code} does not exist in {wh.db_name}!")
            else:
                print(f"    -> CRITICAL: Could not find original product {item.productid_id} in any DB!")
