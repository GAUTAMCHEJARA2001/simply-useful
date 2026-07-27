import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    tables = ['Category', 'Brand', 'Unit', 'Product']
    print("--- Public Schema Counts ---")
    for t in tables:
        cursor.execute(f'SELECT count(*) FROM public."{t}";')
        count = cursor.fetchone()[0]
        print(f"{t}: {count}")
        
    print("--- wh_navsari_factory Schema Counts ---")
    for t in tables:
        cursor.execute(f'SELECT count(*) FROM wh_navsari_factory."{t}";')
        count = cursor.fetchone()[0]
        print(f"{t}: {count}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
