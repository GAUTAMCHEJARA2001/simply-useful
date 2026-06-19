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
        
        # Check columns of core_domain
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'core_domain';
        """)
        print("core_domain columns:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
            
        # Check if core_domain has data
        cursor.execute("SELECT COUNT(*) FROM core_domain;")
        count = cursor.fetchone()[0]
        print(f"core_domain row count: {count}")
        if count > 0:
            cursor.execute("SELECT * FROM core_domain LIMIT 5;")
            print("core_domain sample rows:")
            for row in cursor.fetchall():
                print(f"  {row}")
                
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
