"""Find cancelled orders in all warehouse schemas."""
import os
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL", "")
clean_url = db_url.strip('"').strip("'")
base_url = clean_url.split('?')[0] if '?' in clean_url else clean_url
url = urlparse(base_url)

db_params = {
    'dbname': url.path[1:],
    'user': unquote(url.username or ''),
    'password': unquote(url.password or ''),
    'host': url.hostname,
    'port': url.port or 5432,
}

conn = psycopg2.connect(**db_params)
cur = conn.cursor()

# Get all warehouse schemas
cur.execute("""SELECT id, name, schema_name FROM "Warehouse" WHERE active = true AND schema_name IS NOT NULL AND schema_name != 'public';""")
warehouses = cur.fetchall()

print(f"Found {len(warehouses)} warehouses\n")

total = 0
for wh_id, wh_name, schema in warehouses:
    try:
        cur.execute(f"""
            SELECT id, "orderId", status, "partyName", "soEmail", date, "grandTotal", narration
            FROM "{schema}"."Order"
            WHERE status = 'Cancelled'
            ORDER BY date DESC;
        """)
        rows = cur.fetchall()
        if rows:
            print(f"=== {wh_name} ({schema}) - {len(rows)} cancelled orders ===")
            for row in rows:
                oid, order_id, status, party, so, date, amount, narration = row
                print(f"  Order ID: {order_id}")
                print(f"  Party: {party}, SO: {so}")
                print(f"  Date: {date}, Amount: {amount}")
                if narration:
                    print(f"  Narration: {narration}")
                print()
            total += len(rows)
        else:
            print(f"  [{wh_name}] No cancelled orders.")
    except Exception as e:
        conn.rollback()
        print(f"  [{wh_name}] Error: {e}")

print(f"\nTotal cancelled orders across all warehouses: {total}")

cur.close()
conn.close()
