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
        
        print("Fetching public tables...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables in public schema ({len(tables)}): {tables}")
        
        # Also check django_migrations table
        if 'django_migrations' in tables:
            print("\nFetching django_migrations entries...")
            cursor.execute("SELECT app, name, applied FROM django_migrations ORDER BY applied;")
            for row in cursor.fetchall():
                print(f"  App: {row[0]}, Name: {row[1]}, Applied: {row[2]}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
