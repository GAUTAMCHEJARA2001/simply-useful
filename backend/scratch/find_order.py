import os, sys, django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import Order, Orderitem, Warehouse

def find_order():
    from api.models import Warehouse, Order, Orderitem
    
    print("All Warehouses in database:")
    for wh in Warehouse.objects.all():
        print(f"  - ID: {wh.id} | Name: {wh.name} | Active: {wh.active} | DB: {wh.db_name}")
        
    print("\nSearching for any order containing '893773' across all databases...")
    for wh in Warehouse.objects.all():
        if not wh.db_name:
            continue
        try:
            orders = Order.objects.using(wh.db_name).filter(orderid__icontains='893773')
            if orders.exists():
                for o in orders:
                    print(f"\n==========================================")
                    print(f"Found in Warehouse: {wh.name} (Active: {wh.active}, DB: {wh.db_name})")
                    print(f"OrderID: {o.orderid} | Date: {o.date}")
                    print(f"Party: {o.partyname} | Total: {o.grandtotal} | Status: {o.status}")
                    print(f"Created: {o.createdat}")
                    
                    items = Orderitem.objects.using(wh.db_name).filter(orderid_id=o.id)
                    print(f"Items:")
                    for item in items:
                        p_name = "Unknown"
                        try:
                            from api.models import Product
                            p = Product.objects.using(wh.db_name).filter(id=item.productid_id).first()
                            if p:
                                p_name = p.name
                        except Exception:
                            pass
                        print(f"  - {p_name} (ID: {item.productid_id}) | Qty: {item.qty} | Price: {item.price} | Total: {item.total}")
            else:
                # Let's also check if any order has partial match or if we can print the latest order ID
                latest = Order.objects.using(wh.db_name).order_by('-createdat').first()
                if latest:
                    print(f"  Warehouse '{wh.name}' latest order: {latest.orderid} created at {latest.createdat}")
        except Exception as e:
            print(f"Error querying {wh.db_name}: {e}")

if __name__ == '__main__':
    find_order()
