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

try:
    print("Deleting Products from wh_main...")
    cur.execute('DELETE FROM wh_main."Product";')
    print("Deleting Units from wh_main...")
    cur.execute('DELETE FROM wh_main."Unit";')
    print("Deleting Brands from wh_main...")
    cur.execute('DELETE FROM wh_main."Brand";')
    print("Deleting Categories from wh_main...")
    cur.execute('DELETE FROM wh_main."Category";')
    conn.commit()
    print("Successfully removed product data from wh_main!")
except Exception as e:
    conn.rollback()
    print("Error:", e)
finally:
    conn.close()
