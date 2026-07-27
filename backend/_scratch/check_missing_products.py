import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM wh_main."Product" 
        WHERE id NOT IN (SELECT id FROM public."Product")
    """)
    missing = cursor.fetchone()[0]
    print(f"Products in wh_main missing from public: {missing}")
    
    cursor.execute("""
        SELECT COUNT(*) FROM wh_main."Product"
    """)
    total = cursor.fetchone()[0]
    print(f"Total Products in wh_main: {total}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
