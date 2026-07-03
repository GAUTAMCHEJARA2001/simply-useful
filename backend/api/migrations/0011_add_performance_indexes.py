# Generated manually for performance optimization
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_add_warehouse_to_dealer_distributor'),
    ]

    operations = [
        # Dealer indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_dealer_company ON Dealer(companyId);",
            "DROP INDEX IF EXISTS idx_dealer_company;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_dealer_warehouse ON Dealer(warehouseId);",
            "DROP INDEX IF EXISTS idx_dealer_warehouse;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_dealer_name ON Dealer(dealerName);",
            "DROP INDEX IF EXISTS idx_dealer_name;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_dealer_so ON Dealer(assignedSoEmail);",
            "DROP INDEX IF EXISTS idx_dealer_so;"
        ),
        
        # Distributor indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_distributor_company ON Distributor(companyId);",
            "DROP INDEX IF EXISTS idx_distributor_company;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_distributor_warehouse ON Distributor(warehouseId);",
            "DROP INDEX IF EXISTS idx_distributor_warehouse;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_distributor_name ON Distributor(distributorName);",
            "DROP INDEX IF EXISTS idx_distributor_name;"
        ),
        
        # Order indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_order_status ON \"Order\"(status);",
            "DROP INDEX IF EXISTS idx_order_status;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_order_date ON \"Order\"(date);",
            "DROP INDEX IF EXISTS idx_order_date;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_order_company ON \"Order\"(companyId);",
            "DROP INDEX IF EXISTS idx_order_company;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_order_so ON \"Order\"(soEmail);",
            "DROP INDEX IF EXISTS idx_order_so;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_order_warehouse ON \"Order\"(assignedWarehouse);",
            "DROP INDEX IF EXISTS idx_order_warehouse;"
        ),
        
        # OrderItem indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_orderitem_order ON OrderItem(orderId);",
            "DROP INDEX IF EXISTS idx_orderitem_order;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_orderitem_product ON OrderItem(productId);",
            "DROP INDEX IF EXISTS idx_orderitem_product;"
        ),
        
        # Product indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_company ON Product(companyId);",
            "DROP INDEX IF EXISTS idx_product_company;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_code ON Product(productCode);",
            "DROP INDEX IF EXISTS idx_product_code;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_category ON Product(categoryId);",
            "DROP INDEX IF EXISTS idx_product_category;"
        ),
        
        # PurchaseItem indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_purchaseitem_product ON PurchaseItem(productName);",
            "DROP INDEX IF EXISTS idx_purchaseitem_product;"
        ),
        
        # StockTransaction indexes
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_stocktxn_product ON StockTransaction(productId);",
            "DROP INDEX IF EXISTS idx_stocktxn_product;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_stocktxn_reason ON StockTransaction(reason);",
            "DROP INDEX IF EXISTS idx_stocktxn_reason;"
        ),
    ]
