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
        
        cursor.execute('SELECT id, schema_name, name FROM "Warehouse";')
        print("Warehouses:")
        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, Schema: {row[1]}, Name: {row[2]}")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
