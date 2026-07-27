import psycopg2
import traceback

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

# The tables we want to copy from tenant schemas into public
TRANSACTIONAL_TABLES = [
    'Order', 'OrderItem', 'DispatchLog', 'DispatchLogItem', 
    'ReturnLog', 'ReturnLogItem', 'Visit', 'Expense',
    'Purchase', 'PurchaseItem', 'PurchaseOrder', 'PurchaseOrderItem',
    'BOM', 'BOMItem', 'Lead', 'LeadFollowUp', 'LeadStageHistory',
    'StockTransaction', 'Dealer', 'Distributor'
]

# We don't copy Dealer/Distributor again as they are already globally managed, wait! We might need to if they are missing?
# Actually Dealer and Distributor are already in public. Let's remove them from the list to avoid duplicate key errors.
TRANSACTIONAL_TABLES = [
    'Order', 'OrderItem', 'DispatchLog', 'DispatchLogItem', 
    'ReturnLog', 'ReturnLogItem', 'Visit', 'Expense',
    'Purchase', 'PurchaseItem', 'PurchaseOrder', 'PurchaseOrderItem',
    'BOM', 'BOMItem', 'Lead', 'LeadFollowUp', 'LeadStageHistory',
    'StockTransaction'
]

def migrate():
    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    # 1. Create Tables in Public
    for table in TRANSACTIONAL_TABLES:
        print(f"Creating table {table} in public schema (if not exists)...")
        # We copy the schema exactly from wh_navsari_factory
        cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = '{table}'
            );
        """)
        exists = cursor.fetchone()[0]
        if not exists:
            cursor.execute(f'CREATE TABLE public."{table}" (LIKE wh_navsari_factory."{table}" INCLUDING ALL);')
            
    # 2. Insert data from both schemas
    for warehouse_schema in ['wh_navsari_factory', 'wh_main']:
        print(f"\n--- Processing warehouse schema: {warehouse_schema} ---")
        for table in TRANSACTIONAL_TABLES:
            try:
                # We use ON CONFLICT DO NOTHING to avoid crashing on duplicate IDs (e.g. if already copied)
                # But LIKE INCLUDING ALL doesn't automatically create a primary key constraint if we don't specify the column?
                # Actually INCLUDING ALL copies constraints. 
                # Let's check if the table exists in the source schema first
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = '{warehouse_schema}' AND table_name = '{table}'
                    );
                """)
                if not cursor.fetchone()[0]:
                    continue
                    
                # To handle ON CONFLICT, we need the primary key column name. Usually 'id'.
                cursor.execute(f'INSERT INTO public."{table}" SELECT * FROM {warehouse_schema}."{table}" ON CONFLICT (id) DO NOTHING;')
                print(f"Copied {table} from {warehouse_schema}")
            except Exception as e:
                print(f"Error copying {table} from {warehouse_schema}: {e}")
                conn.rollback()
                continue
                
    # 3. Create Inventory Table (Prisma fabricated model)
    print("\n--- Creating Inventory Ledger ---")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS public."Inventory" (
            id SERIAL PRIMARY KEY,
            "productId" TEXT NOT NULL,
            "warehouseId" INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            "avgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT "Inventory_productId_warehouseId_key" UNIQUE ("productId", "warehouseId")
        );
        CREATE INDEX IF NOT EXISTS "Inventory_productId_idx" ON public."Inventory" ("productId");
        CREATE INDEX IF NOT EXISTS "Inventory_warehouseId_idx" ON public."Inventory" ("warehouseId");
    """)
    
    # 4. Migrate Inventory Data from Product.currentStock
    warehouse_mapping = {
        'wh_main': 1,
        'wh_navsari_factory': 2
    }
    
    for schema, w_id in warehouse_mapping.items():
        try:
            cursor.execute(f"""
                INSERT INTO public."Inventory" ("productId", "warehouseId", quantity, "createdAt", "updatedAt")
                SELECT id, {w_id}, COALESCE("currentStock", 0), NOW(), NOW()
                FROM {schema}."Product"
                ON CONFLICT ("productId", "warehouseId") 
                DO UPDATE SET quantity = EXCLUDED.quantity;
            """)
            print(f"Migrated inventory stock from {schema} (Warehouse ID: {w_id})")
        except Exception as e:
            print(f"Error migrating inventory for {schema}: {e}")
            conn.rollback()

    conn.commit()
    print("\nMigration completed successfully!")
    conn.close()

if __name__ == '__main__':
    migrate()
