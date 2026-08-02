import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog') 
        ORDER BY table_schema, table_name;
    """)
    tables = cur.fetchall()
    for t in tables:
        print(f"{t[0]}.{t[1]}")
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
