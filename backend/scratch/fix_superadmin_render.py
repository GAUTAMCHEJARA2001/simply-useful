"""
Fix superadmin user on Render DB after wipe.
Resets password and re-links to all warehouses.
"""
import os, sys, uuid, psycopg2, bcrypt
from urllib.parse import urlparse

SUPERADMIN_EMAIL = "super@kamla.com"
SUPERADMIN_PASSWORD = "admin123"
SUPERADMIN_NAME = "Kamla Super Admin"

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("ERROR: DATABASE_URL not set!")
    sys.exit(1)

parsed = urlparse(db_url)
conn = psycopg2.connect(
    host=parsed.hostname, port=parsed.port or 5432,
    dbname=parsed.path.lstrip("/"), user=parsed.username,
    password=parsed.password, connect_timeout=20, sslmode="require",
)
conn.autocommit = False
cur = conn.cursor()

print("Fixing superadmin on Render DB...\n")

# First, inspect UserWarehouseAccess columns so we get it right
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'UserWarehouseAccess'
    ORDER BY ordinal_position;
""")
uwa_cols = cur.fetchall()
print("UserWarehouseAccess columns:")
for col in uwa_cols:
    print(f"  {col[0]} ({col[1]}) nullable={col[2]} default={col[3]}")
print()

try:
    hashed = bcrypt.hashpw(SUPERADMIN_PASSWORD.encode(), bcrypt.gensalt(10)).decode()

    # Check if superadmin exists
    cur.execute('SELECT id FROM "User" WHERE email = %s;', (SUPERADMIN_EMAIL,))
    row = cur.fetchone()

    if row:
        super_id = row[0]
        cur.execute(
            'UPDATE "User" SET "hashedPassword" = %s, active = true, role = \'SUPERADMIN\' WHERE email = %s;',
            (hashed, SUPERADMIN_EMAIL)
        )
        print(f"  OK: Reset password for {SUPERADMIN_EMAIL} (id={super_id})")
    else:
        cur.execute('SELECT id FROM "Company" LIMIT 1;')
        company_row = cur.fetchone()
        company_id = company_row[0] if company_row else None

        super_id = "c" + uuid.uuid4().hex[:23]
        cur.execute(
            'INSERT INTO "User" (id, email, name, "hashedPassword", role, active, "companyId") VALUES (%s, %s, %s, %s, \'SUPERADMIN\', true, %s);',
            (super_id, SUPERADMIN_EMAIL, SUPERADMIN_NAME, hashed, company_id)
        )
        print(f"  OK: Created superadmin: {SUPERADMIN_EMAIL}")

    # Get all warehouses and re-link (let the DB auto-generate the id)
    cur.execute('SELECT id, name FROM "Warehouse";')
    warehouses = cur.fetchall()
    print(f"\n  Found {len(warehouses)} warehouse(s):")

    for wh_id, wh_name in warehouses:
        cur.execute(
            'INSERT INTO "UserWarehouseAccess" ("userId", "warehouseId") VALUES (%s, %s);',
            (super_id, wh_id)
        )
        print(f"    OK: Linked superadmin to warehouse: {wh_name}")

    conn.commit()
    print(f"\nSUCCESS!")
    print(f"  Email   : {SUPERADMIN_EMAIL}")
    print(f"  Password: {SUPERADMIN_PASSWORD}")
    print(f"  Role    : SUPERADMIN")
    print(f"  Linked to {len(warehouses)} warehouse(s)")

except Exception as e:
    conn.rollback()
    print(f"\nERROR: {e}")
finally:
    cur.close()
    conn.close()
