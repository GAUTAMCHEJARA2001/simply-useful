import os

filepath = r"d:\cost 2\simply-useful\simply-useful\simply-useful\backend\api\views.py"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Bom queries in check_negative_raw_materials
old_bom_code = """                bom = Bom.objects.filter(productcode=prod.productcode).first()
                if not bom:
                    bom = Bom.objects.filter(name=prod.name).first()
                if bom:
                    bom_items = Bomitem.objects.filter(bomid=bom)"""
new_bom_code = """                bom = Bom.objects.using(wh.db_name).filter(productcode=prod.productcode).first()
                if not bom:
                    bom = Bom.objects.using(wh.db_name).filter(name=prod.name).first()
                if bom:
                    bom_items = Bomitem.objects.using(wh.db_name).filter(bomid=bom)"""
if old_bom_code in content:
    content = content.replace(old_bom_code, new_bom_code)
    print("Fixed Bom queries.")

# 2. Add strict dispatch check in partial_dispatch
# Find where partial_dispatch validates items
search_dispatch = """                if oi.sentqty + qty_to_send > oi.qty:
                    return send_error(f'Cannot dispatch {qty_to_send} of {p_id}. Already sent: {oi.sentqty}, Total ordered: {oi.qty}', 400)"""

strict_dispatch_code = """                if oi.sentqty + qty_to_send > oi.qty:
                    return send_error(f'Cannot dispatch {qty_to_send} of {p_id}. Already sent: {oi.sentqty}, Total ordered: {oi.qty}', 400)
            
            # --- STRICT DISPATCH CHECK ---
            # Calculate current stock for each item before dispatching
            from api.models import Product, Purchaseitem, Orderitem, Stocktransaction
            from django.db.models import Sum
            
            wh_val = getattr(instance, 'assigned_warehouse', None)
            wh_name = wh_val.name if wh_val and hasattr(wh_val, 'name') else data.get('warehouseDetails')
            
            # Since inventory is strictly enforced, we calculate current stock
            # (using same logic as check_negative_raw_materials but for finished goods)
            for item_data in items:
                p_id = item_data.get('productId') or item_data.get('product_id')
                qty_to_send = int(item_data.get('qty', 0))
                if qty_to_send <= 0:
                    continue
                    
                p = Product.objects.using(db_alias).filter(id=p_id).first()
                if not p: continue
                
                stock = float(p.openingstock or 0)
                
                # purchases
                purchases = Purchaseitem.objects.using(db_alias).filter(
                    purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED'],
                    productname=p.name
                ).aggregate(total=Sum('qty'))
                stock += float(purchases['total'] or 0)
                
                purchases_ret = Purchaseitem.objects.using(db_alias).filter(
                    purchaseid__status='Returned',
                    productname=p.name
                ).aggregate(total=Sum('qty'))
                stock -= float(purchases_ret['total'] or 0)
                
                # sales (Completed/Returned)
                sales = Orderitem.objects.using(db_alias).filter(
                    orderid__status='Completed',
                    productid_id=p_id
                ).aggregate(total=Sum('qty'))
                stock -= float(sales['total'] or 0)
                
                sales_ret = Orderitem.objects.using(db_alias).filter(
                    orderid__status='Returned',
                    productid_id=p_id
                ).aggregate(total=Sum('qty'))
                stock += float(sales_ret['total'] or 0)
                
                # stock transactions
                st_aggs = Stocktransaction.objects.using(db_alias).exclude(
                    reason__in=['PENDING_APPROVAL', 'REJECTED']
                ).filter(productid_id=p_id).aggregate(total=Sum('quantity'))
                stock += float(st_aggs['total'] or 0)
                
                if stock < qty_to_send:
                    return Response({'success': False, 'message': f'Cannot dispatch! Insufficient stock for {p.name}. Available: {stock}, Requested: {qty_to_send}'}, status=400)
            # --- END STRICT DISPATCH CHECK ---"""

if search_dispatch in content:
    content = content.replace(search_dispatch, strict_dispatch_code)
    print("Added strict dispatch check.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching views.py")
