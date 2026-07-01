import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Warehouse, Product, Orderitem, Purchaseorderitem, Purchaseitem, Stocktransaction, Bomitem

def fix_all_models():
    models_to_check = [
        (Orderitem, 'productid_id', 'Orderitem'),
        (Purchaseorderitem, 'productid_id', 'Purchaseorderitem'),
        (Stocktransaction, 'productid_id', 'Stocktransaction'),
        ( 'productid_id', ''),
    ]

    # Pre-cache all products by db and code for extreme speed
    print("Loading all products into memory...")
    products_by_db = {}
    products_by_id = {}
    warehouses = list(Warehouse.objects.filter(active=True))
    
    for wh in warehouses:
        if not wh.db_name: continue
        products_by_db[wh.db_name] = {}
        for p in Product.objects.using(wh.db_name).all():
            products_by_db[wh.db_name][p.productcode] = p.id
            products_by_id[p.id] = p.productcode

    print("Products loaded. Starting scan...")
    
    total_fixed = 0

    for wh in warehouses:
        if not wh.db_name: continue
        print(f"\n--- Scanning Warehouse: {wh.name} ({wh.db_name}) ---")
        
        for Model, field_name, name in models_to_check:
            items = Model.objects.using(wh.db_name).all()
            fixes = 0
            
            for item in items:
                pid = getattr(item, field_name)
                if not pid: continue
                
                # Check if it exists in current DB's product dict
                found_local = False
                for pcode, local_id in products_by_db[wh.db_name].items():
                    if local_id == pid:
                        found_local = True
                        break
                        
                if found_local:
                    continue
                    
                # It does not exist locally. We must find its product code globally.
                pcode = products_by_id.get(pid)
                if not pcode:
                    # Maybe the product was deleted entirely. We can't do much.
                    continue
                    
                # Find the local product ID for this code
                correct_local_id = products_by_db[wh.db_name].get(pcode)
                if correct_local_id:
                        # Check if target inventory already exists
                        existing = Model.objects.using(wh.db_name).filter(productid_id=correct_local_id, warehouseid_id=item.warehouseid_id).first()
                        if existing and existing.id != item.id:
                            # Merge quantities and delete the corrupted record
                            existing.quantity += item.quantity
                            existing.save(using=wh.db_name, update_fields=['quantity'])
                            item.delete(using=wh.db_name)
                            fixes += 1
                            total_fixed += 1
                            continue
                            
                    setattr(item, field_name, correct_local_id)
                    item.save(using=wh.db_name, update_fields=[field_name])
                    fixes += 1
                    total_fixed += 1
                    
            if fixes > 0:
                print(f"  Fixed {fixes} corrupted {name} records.")
                
    print(f"\nDone! Total corrupted records permanently fixed: {total_fixed}")

if __name__ == '__main__':
    fix_all_models()
