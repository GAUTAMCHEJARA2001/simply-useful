import os, psycopg2
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(db_url)
conn = psycopg2.connect(
    host=parsed.hostname, port=parsed.port or 5432,
    dbname=parsed.path.lstrip("/"), user=parsed.username,
    password=parsed.password, sslmode="require",
)
cur = conn.cursor()

cur.execute('SELECT id, name, active, schema_name, db_name FROM "Warehouse";')
warehouses = cur.fetchall()
print(f"Warehouses ({len(warehouses)}):")
for w in warehouses:
    print(f"  id={w[0]} | name={w[1]} | active={w[2]} | schema_name={w[3]} | db_name={w[4]}")

cur.close()
conn.close()
