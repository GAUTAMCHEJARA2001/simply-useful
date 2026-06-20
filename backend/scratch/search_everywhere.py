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

def search_everywhere():
    print("Database Settings from connection:")
    print(f"  - Engine: {connection.settings_dict.get('ENGINE')}")
    print(f"  - Name: {connection.settings_dict.get('NAME')}")
    print(f"  - Host: {connection.settings_dict.get('HOST')}")
    print(f"  - Port: {connection.settings_dict.get('PORT')}")
    
    print("\nSearching for transaction ID containing 893773 in all database schemas on Supabase...")
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata;")
        schemas = [r[0] for r in cursor.fetchall()]
        
        found = False
        for schema in schemas:
            if schema.startswith('pg_') or schema == 'information_schema':
                continue
            
            # 1. Search Sales Orders
            try:
                cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'Order');", [schema])
                if cursor.fetchone()[0]:
                    cursor.execute(f'SELECT id, "orderId", "partyName", "grandTotal" FROM "{schema}"."Order" WHERE "orderId" LIKE %s;', ['%893773%'])
                    rows = cursor.fetchall()
                    for r in rows:
                        print(f"FOUND Sales Order in schema '{schema}': ID={r[0]}, orderId={r[1]}, party={r[2]}, total={r[3]}")
                        found = True
                        
                        # Retrieve items for Sales Order
                        cursor.execute(f'SELECT productid_id, qty, price, total FROM "{schema}"."Orderitem" WHERE orderid_id = %s;', [r[0]])
                        items = cursor.fetchall()
                        print(f"  Items:")
                        for it in items:
                            p_name = "Unknown"
                            try:
                                cursor.execute(f'SELECT name FROM "{schema}"."Product" WHERE id = %s;', [it[0]])
                                p_row = cursor.fetchone()
                                if p_row:
                                    p_name = p_row[0]
                            except Exception:
                                pass
                            print(f"    - {p_name} (ID: {it[0]}) | Qty: {it[1]} | Price: {it[2]} | Total: {it[3]}")
            except Exception as e:
                print(f"Error checking Sales Order in '{schema}': {e}")
                
            # 2. Search Purchases
            try:
                cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'Purchase');", [schema])
                if cursor.fetchone()[0]:
                    cursor.execute(f'SELECT id, "purchaseId", "vendorName", "grandTotal" FROM "{schema}"."Purchase" WHERE "purchaseId" LIKE %s;', ['%893773%'])
                    rows = cursor.fetchall()
                    for r in rows:
                        print(f"FOUND Purchase in schema '{schema}': ID={r[0]}, purchaseId={r[1]}, vendor={r[2]}, total={r[3]}")
                        found = True
            except Exception as e:
                print(f"Error checking Purchase in '{schema}': {e}")
                
            # 3. Search Purchase Orders
            try:
                cursor.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'Purchaseorder');", [schema])
                if cursor.fetchone()[0]:
                    cursor.execute(f'SELECT id, "poNumber", "netAmount" FROM "{schema}"."Purchaseorder" WHERE "poNumber" LIKE %s;', ['%893773%'])
                    rows = cursor.fetchall()
                    for r in rows:
                        print(f"FOUND Purchase Order in schema '{schema}': ID={r[0]}, poNumber={r[1]}, amount={r[2]}")
                        found = True
            except Exception as e:
                print(f"Error checking Purchase Order in '{schema}': {e}")
                
        if not found:
            print("No transactions containing '893773' were found anywhere in the database.")

if __name__ == '__main__':
    search_everywhere()
