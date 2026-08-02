import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT app, name FROM django_migrations ORDER BY id;")
    migrations = cur.fetchall()
    
    print("Remote migrations applied:")
    for m in migrations:
        if m[0] in ('api', 'core'):
            print(f"{m[0]}: {m[1]}")
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
