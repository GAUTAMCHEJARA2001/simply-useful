import psycopg2

def main():
    try:
        print("Connecting to Supabase using keyword arguments...")
        conn = psycopg2.connect(
            host="aws-1-ap-southeast-2.pooler.supabase.com",
            port=6543,
            database="postgres",
            user="postgres.fzwtawqtoahlevexzgvx",
            password="G@ut@m1306200"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Altering Warehouse table...")
        cursor.execute('ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "db_name" varchar(100) NULL;')
        cursor.execute('ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "db_host" varchar(200) NULL;')
        cursor.execute('ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "db_port" integer NULL;')
        print("Altered Warehouse table successfully!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
