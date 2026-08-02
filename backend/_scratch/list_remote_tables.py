import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = cur.fetchall()
    print("Tables in public schema:")
    for t in tables:
        print(t[0])
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
