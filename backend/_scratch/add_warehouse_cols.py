import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

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
    
    for table in TABLES:
        # Check if table exists in public
        cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = '{table}'
            );
        """)
        if not cursor.fetchone()[0]:
            print(f"Table {table} does not exist in public. Skipping.")
            continue
            
        print(f"Adding warehouseId to {table}...")
        try:
            cursor.execute(f'ALTER TABLE public."{table}" ADD COLUMN IF NOT EXISTS "warehouseId" INTEGER;')
        except Exception as e:
            print(f"Error adding column to {table}: {e}")
            
        # Try to find primary key column (usually 'id')
        cursor.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = 'id'
        """)
        has_id = cursor.fetchone()
        
        if has_id:
            # Update from wh_navsari_factory (2)
            try:
                cursor.execute(f'''
                    UPDATE public."{table}" p
                    SET "warehouseId" = 2
                    FROM wh_navsari_factory."{table}" n
                    WHERE p.id = n.id AND p."warehouseId" IS NULL;
                ''')
                print(f"Updated {cursor.rowcount} rows in {table} to warehouseId=2")
            except Exception as e:
                print(f"Error updating from navsari {table}: {e}")
                
            # Update from wh_main (1)
            try:
                cursor.execute(f'''
                    UPDATE public."{table}" p
                    SET "warehouseId" = 1
                    FROM wh_main."{table}" m
                    WHERE p.id = m.id AND p."warehouseId" IS NULL;
                ''')
                print(f"Updated {cursor.rowcount} rows in {table} to warehouseId=1")
            except Exception as e:
                print(f"Error updating from main {table}: {e}")
        else:
            print(f"Table {table} has no 'id' column, skipping data update.")
            
    print("Warehouse columns added and updated successfully!")
    conn.close()

if __name__ == '__main__':
    migrate()
