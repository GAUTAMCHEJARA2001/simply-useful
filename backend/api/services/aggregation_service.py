import concurrent.futures
from django.core.cache import cache
from django.db.models import Sum, Count
from api.models import Warehouse, Inventory, Order, Purchase
from api.db_router import set_current_db

def _fetch_warehouse_kpis(warehouse):
    """
    Fetches KPIs for a single warehouse inside an isolated thread.
    """
    # 1. Open tenant context for this specific thread
    set_current_db(warehouse.db_name)
    
    try:
        # 2. Query KPIs dynamically
        total_stock = Inventory.objects.using(warehouse.db_name).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        # Determine low stock (stock <= 50)
        low_stock_count = Inventory.objects.using(warehouse.db_name).filter(quantity__lte=50).count()
        
        # Pending orders
        pending_orders = Order.objects.using(warehouse.db_name).filter(status='Pending').count()
        
        return {
            "warehouse": warehouse.name,
            "warehouse_id": warehouse.id,
            "stock": total_stock,
            "low_stock_count": low_stock_count,
            "pending_orders": pending_orders,
            "status": "online"
        }
    except Exception as e:
        # If DB is not reachable or tables missing
        return {
            "warehouse": warehouse.name,
            "warehouse_id": warehouse.id,
            "stock": 0,
            "low_stock_count": 0,
            "pending_orders": 0,
            "status": "offline",
            "error": str(e)
        }

def get_super_admin_dashboard_kpis(company_id=1):
    """
    Aggregates KPIs across all active warehouse tenant databases using a ThreadPoolExecutor.
    Includes a short TTL cache to prevent hammering databases.
    """
    cache_key = f'super_admin_kpis_company_{company_id}'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        return cached_data

    warehouses = Warehouse.objects.using('default').filter(active=True, db_name__isnull=False)
    
    unified_payload = {
        "global_inventory": 0,
        "global_pending_orders": 0,
        "warehouses": []
    }
    
    # Run queries concurrently across databases
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_wh = {executor.submit(_fetch_warehouse_kpis, wh): wh for wh in warehouses}
        
        for future in concurrent.futures.as_completed(future_to_wh):
            result = future.result()
            unified_payload["warehouses"].append(result)
            
            if result["status"] == "online":
                unified_payload["global_inventory"] += result["stock"]
                unified_payload["global_pending_orders"] += result["pending_orders"]
                
    # Cache for 60 seconds (TTL)
    cache.set(cache_key, unified_payload, timeout=60)
    
    return unified_payload
