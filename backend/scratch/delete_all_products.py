import os, psycopg2
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL", "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres")

url = urlparse(db_url)
conn = psycopg2.connect(
    host=url.hostname, port=url.port or 5432,
    dbname=url.path.lstrip("/"), user=url.username,
    password=url.password, sslmode="require"
)
conn.autocommit = False
cur = conn.cursor()

schemas = ['wh_main', 'wh_navsari_factory']

try:
    for schema in schemas:
        print(f"Cleaning products from {schema}...")
        cur.execute(f'DELETE FROM {schema}."Product";')
        cur.execute(f'DELETE FROM {schema}."Unit";')
        cur.execute(f'DELETE FROM {schema}."Brand";')
        cur.execute(f'DELETE FROM {schema}."Category";')
    conn.commit()
    print("Successfully removed all product data from all warehouses!")
except Exception as e:
    conn.rollback()
    print("Error:", e)
finally:
    conn.close()
