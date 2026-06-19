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
        
        cursor.execute("""
            SELECT pid, state, query, wait_event_type, wait_event, query_start
            FROM pg_stat_activity
            WHERE state != 'idle' AND pid != pg_backend_pid()
            ORDER BY query_start DESC;
        """)
        print("Active queries:")
        for row in cursor.fetchall():
            print(f"PID: {row[0]}, State: {row[1]}, Query: {row[2][:100]}, Wait: {row[3]}/{row[4]}, Start: {row[5]}")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
