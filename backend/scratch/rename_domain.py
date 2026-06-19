import psycopg2

def main():
    try:
        print("Connecting to Supabase...")
        conn = psycopg2.connect(
            host="aws-1-ap-southeast-2.pooler.supabase.com",
            port=6543,
            database="postgres",
            user="postgres.fzwtawqtoahlevexzgvx",
            password="G@ut@m1306200"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Renaming table core_domain to \"Domain\"...")
        cursor.execute('ALTER TABLE core_domain RENAME TO "Domain";')
        print("Successfully renamed core_domain to \"Domain\"!")
        
        # Verify
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'Domain';
        """)
        row = cursor.fetchone()
        if row:
            print("Verified: \"Domain\" table exists in public schema!")
        else:
            print("Warning: \"Domain\" table still not found.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
