"""Quick check: count rows in key tables on Render DB."""
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

# Check all wh_* schemas
cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'wh_%' ORDER BY schema_name;")
schemas = [r[0] for r in cur.fetchall()]

tables_to_check = ["Product", "Dealer", "Order", "Lead", "Supplier", "Category", "Brand", "Unit"]

for schema in schemas:
    print(f"\n=== Schema: {schema} ===")
    for table in tables_to_check:
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{schema}"."{table}";')
            count = cur.fetchone()[0]
            status = "EMPTY" if count == 0 else f"{count} rows"
            print(f"  {table}: {status}")
        except Exception as e:
            conn.rollback()
            print(f"  {table}: error - {e}")

# Check public schema users
print(f"\n=== Public Schema ===")
cur.execute('SELECT email, role, active FROM "User";')
users = cur.fetchall()
print(f"  Users ({len(users)}):")
for u in users:
    print(f"    {u[0]} | {u[1]} | active={u[2]}")

cur.execute('SELECT id, name FROM "Warehouse";')
warehouses = cur.fetchall()
print(f"  Warehouses ({len(warehouses)}):")
for w in warehouses:
    print(f"    id={w[0]} | {w[1]}")

cur.close()
conn.close()
