import os, psycopg2
from urllib.parse import urlparse
db_url = os.environ.get('DATABASE_URL', 'postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres')
url = urlparse(db_url)
conn = psycopg2.connect(
    host=url.hostname, port=url.port or 5432,
    dbname=url.path.lstrip('/'), user=url.username,
    password=url.password, sslmode='require'
)
cur = conn.cursor()
cur.execute('SELECT id, name, schema_name FROM public."Warehouse";')
for row in cur.fetchall():
    print(row)
conn.close()
