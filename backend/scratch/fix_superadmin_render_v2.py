"""
Fix superadmin password on Render database.
Uses correct PascalCase column names.
"""
import os, sys, psycopg2, bcrypt, uuid
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("ERROR: DATABASE_URL not set!")
    sys.exit(1)

url = urlparse(db_url)
conn = psycopg2.connect(
    host=url.hostname, port=url.port or 5432,
    dbname=url.path.lstrip("/"), user=url.username,
    password=url.password, connect_timeout=20, sslmode="require"
)
conn.autocommit = False
cur = conn.cursor()

hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt(10)).decode()

# Check if superadmin exists
cur.execute('SELECT id FROM public."User" WHERE email = %s;', ("super@kamla.com",))
row = cur.fetchone()

if row:
    super_id = row[0]
    cur.execute(
        'UPDATE public."User" SET "hashedPassword" = %s, active = true, role = %s WHERE email = %s;',
        (hashed, "SUPERADMIN", "super@kamla.com")
    )
    print(f"Updated superadmin password for super@kamla.com")
else:
    cur.execute('SELECT id FROM public."Company" LIMIT 1;')
    co = cur.fetchone()
    company_id = co[0] if co else None
    super_id = "c" + uuid.uuid4().hex[:23]
    cur.execute(
        'INSERT INTO public."User" (id, email, name, "hashedPassword", role, active, "companyId") VALUES (%s, %s, %s, %s, %s, true, %s);',
        (super_id, "super@kamla.com", "Kamla Super Admin", hashed, "SUPERADMIN", company_id)
    )
    print(f"Created superadmin: super@kamla.com")

# Re-link superadmin to all warehouses
cur.execute('DELETE FROM public."UserWarehouseAccess" WHERE "userId" = %s;', (super_id,))
cur.execute('SELECT id, name FROM public."Warehouse";')
warehouses = cur.fetchall()

for wh_id, wh_name in warehouses:
    # Try inserting without explicit ID (assuming BIGSERIAL/BIGINT with auto-increment)
    try:
        cur.execute(
            'INSERT INTO public."UserWarehouseAccess" ("userId", "warehouseId") VALUES (%s, %s);',
            (super_id, wh_id)
        )
        print(f"  Linked superadmin to warehouse: {wh_name}")
    except Exception as e:
        print(f"  Error linking warehouse {wh_name}: {e}")

conn.commit()
conn.close()
print("\nDONE! Superadmin reset complete.")
print("Login: super@kamla.com / admin123")
