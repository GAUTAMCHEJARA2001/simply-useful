import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

# The tables we want to copy from tenant schemas into public
TABLES = [
    'Category', 'Brand', 'Unit', 'Product', 'Supplier', 'Market', 'Region', 'Labour',
    'Order', 'OrderItem', 'DispatchLog', 'DispatchLogItem', 
    'ReturnLog', 'ReturnLogItem', 'Visit', 'Expense',
    'Purchase', 'PurchaseItem', 'PurchaseOrder', 'PurchaseOrderItem',
    'BOM', 'BOMItem', 'Lead', 'LeadFollowUp', 'LeadStageHistory',
    'StockTransaction', 'PushSubscription', 'UserProductAccess',
    'api_busyledgerentry', 'api_busyparty'
]

def migrate():
    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # 1. Create Tables in Public
    for table in TABLES:
        print(f"Creating table {table} in public schema (if not exists)...")
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
        for table in TABLES:
            try:
                # Check if table exists in the source schema first
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = '{warehouse_schema}' AND table_name = '{table}'
                    );
                """)
                if not cursor.fetchone()[0]:
                    continue
                    
                # To handle ON CONFLICT, we can use ON CONFLICT (id) DO NOTHING if the table has an 'id' column.
                # Since we don't know the exact PK constraint name or if it's 'id', we can catch the exception.
                try:
                    # Let's see if the table has an id column
                    cursor.execute(f'INSERT INTO public."{table}" SELECT * FROM {warehouse_schema}."{table}" ON CONFLICT DO NOTHING;')
                    print(f"Copied {table} from {warehouse_schema} (used ON CONFLICT DO NOTHING)")
                except Exception:
                    conn.rollback()
                    # Not all tables have constraints that allow ON CONFLICT DO NOTHING without specifying the target.
                    # We will just insert and catch duplicates.
                    try:
                        cursor.execute(f'INSERT INTO public."{table}" SELECT * FROM {warehouse_schema}."{table}";')
                        print(f"Copied {table} from {warehouse_schema}")
                    except Exception as e2:
                        print(f"Error copying {table} from {warehouse_schema} (duplicate PK?): {e2}")
            except Exception as e:
                print(f"Error copying {table} from {warehouse_schema}: {e}")
                
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

    print("\nMigration completed successfully!")
    conn.close()

if __name__ == '__main__':
    migrate()
