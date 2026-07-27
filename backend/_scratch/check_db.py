import os
import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables found: {len(tables)}")
    if len(tables) > 0:
        print("First few tables:", tables[:5])
except Exception as e:
    print(f"Error: {e}")
