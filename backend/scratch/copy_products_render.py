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
    print("Copying Categories...")
    cur.execute('INSERT INTO wh_navsari_factory."Category" SELECT * FROM wh_main."Category" ON CONFLICT (id) DO NOTHING;')
    print("Copying Brands...")
    cur.execute('INSERT INTO wh_navsari_factory."Brand" SELECT * FROM wh_main."Brand" ON CONFLICT (id) DO NOTHING;')
    print("Copying Units...")
    cur.execute('INSERT INTO wh_navsari_factory."Unit" SELECT * FROM wh_main."Unit" ON CONFLICT (id) DO NOTHING;')
    print("Copying Products...")
    cur.execute('INSERT INTO wh_navsari_factory."Product" SELECT * FROM wh_main."Product" ON CONFLICT (id) DO NOTHING;')
    conn.commit()
    print("Successfully copied products and their dependencies to Navsari Factory!")
except Exception as e:
    conn.rollback()
    print("Error:", e)
finally:
    conn.close()
