import psycopg2

def main():
    try:
        conn = psycopg2.connect(
            host="aws-1-ap-southeast-2.pooler.supabase.com",
            port=6543,
            database="postgres",
            user="postgres.fzwtawqtoahlevexzgvx",
            password="G@ut@m1306200"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get all schemas
        cursor.execute("SELECT schema_name FROM information_schema.schemata;")
        schemas = [row[0] for row in cursor.fetchall()]
        
        print("Starting deletion of products from all Supabase schemas:")
        for s in sorted(schemas):
            if s.startswith('wh_'):
                try:
                    # 1. Delete from Inventory first (due to foreign keys)
                    cursor.execute(f'DELETE FROM "{s}"."Inventory";')
                    # 2. Delete from Product
                    cursor.execute(f'DELETE FROM "{s}"."Product";')
                    print(f"  Successfully deleted products and inventory from schema: {s}")
                except Exception as e:
                    print(f"  Error deleting in schema {s}: {e}")
                    
        cursor.close()
        conn.close()
        print("\nCleanup complete!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
