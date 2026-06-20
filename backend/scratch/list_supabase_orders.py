import os, sys

# Load .env manually to connect to Supabase
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
try:
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                val = val.strip().strip('"').strip("'")
                os.environ[key.strip()] = val
except Exception as e:
    print("Warning: Could not load .env file:", e)

import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def list_orders():
    schemas = ['wh_main', 'wh_nashik', 'wh_navsari']
    with connection.cursor() as cursor:
        for schema in schemas:
            print(f"\n==========================================")
            print(f"Schema: {schema}")
            try:
                # Count
                cursor.execute(f'SELECT COUNT(*) FROM "{schema}"."Order";')
                count = cursor.fetchone()[0]
                print(f"Total orders: {count}")
                
                # Fetch recent orders
                if count > 0:
                    cursor.execute(f'SELECT id, "orderId", date, "partyName", "grandTotal", status FROM "{schema}"."Order" ORDER BY date DESC LIMIT 20;')
                    rows = cursor.fetchall()
                    for r in rows:
                        print(f"  - OrderID: {r[1]} | Date: {r[2]} | Party: {r[3]} | Total: {r[4]} | Status: {r[5]}")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == '__main__':
    list_orders()
