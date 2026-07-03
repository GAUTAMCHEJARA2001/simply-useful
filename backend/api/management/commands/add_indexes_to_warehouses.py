"""
Add performance indexes to all warehouse databases.
Run this after deployment: python manage.py add_indexes_to_warehouses
"""
from django.core.management.base import BaseCommand
from django.db import connection
from core.models import Warehouse


INDEXES = [
    # Dealer indexes
    ("idx_dealer_company", "Dealer", "companyId"),
    ("idx_dealer_warehouse", "Dealer", "warehouseId"),
    ("idx_dealer_name", "Dealer", "dealerName"),
    ("idx_dealer_so", "Dealer", "assignedSoEmail"),
    
    # Distributor indexes
    ("idx_distributor_company", "Distributor", "companyId"),
    ("idx_distributor_warehouse", "Distributor", "warehouseId"),
    ("idx_distributor_name", "Distributor", "distributorName"),
    
    # Order indexes
    ("idx_order_status", '"Order"', "status"),
    ("idx_order_date", '"Order"', "date"),
    ("idx_order_company", '"Order"', "companyId"),
    ("idx_order_so", '"Order"', "soEmail"),
    
    # OrderItem indexes
    ("idx_orderitem_order", "OrderItem", "orderId"),
    ("idx_orderitem_product", "OrderItem", "productId"),
    
    # Product indexes
    ("idx_product_company", "Product", "companyId"),
    ("idx_product_code", "Product", "productCode"),
    ("idx_product_category", "Product", "categoryId"),
    
    # PurchaseItem indexes
    ("idx_purchaseitem_product", "PurchaseItem", "productName"),
    
    # StockTransaction indexes
    ("idx_stocktxn_product", "StockTransaction", "productId"),
    ("idx_stocktxn_reason", "StockTransaction", "reason"),
]


class Command(BaseCommand):
    help = 'Add performance indexes to all warehouse databases'

    def handle(self, *args, **options):
        self.stdout.write('Adding indexes to warehouse databases...')
        
        warehouses = Warehouse.objects.using('default').filter(active=True)
        total_created = 0
        
        for wh in warehouses:
            if not wh.db_name:
                continue
            
            created = 0
            for idx_name, table, column in INDEXES:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column});"
                        )
                        created += 1
                except Exception as e:
                    # Table might not exist in this warehouse
                    pass
            
            total_created += created
            self.stdout.write(f'  {wh.name}: {created} indexes')
        
        self.stdout.write(self.style.SUCCESS(f'Done! Created {total_created} indexes across {warehouses.count()} warehouses'))
