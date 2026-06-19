"""
Render Database Wipe Script (Correct Table Names)
==================================================
Connects directly to Render PostgreSQL using psycopg2.
Wipes ALL data from all wh_* tenant schemas using the real table names.
Resets the superadmin user in the public schema.

Run from project root:
  $env:DATABASE_URL="your-render-url"; python backend/scratch/wipe_render_final.py
"""

import os
import sys
import psycopg2
from psycopg2 import sql
import uuid
import bcrypt
from urllib.parse import urlparse

SUPERADMIN_EMAIL = "super@kamla.com"
SUPERADMIN_PASSWORD = "admin123"
SUPERADMIN_NAME = "Kamla Super Admin"

# Exact table names as they exist in Render (PascalCase, no prefix)
# Order matters: children first to avoid FK violations
TENANT_TABLES = [
    "UserProductAccess",
    "BOMItem",
    "BOM",
    "StockBatch",
    "Inventory",
    "StockTransaction",
    "OrderItem",
    "Order",
    "PurchaseItem",
    "Purchase",
    "PurchaseOrderItem",
    "PurchaseOrder",
    "LeadFollowUp",
    "LeadStageHistory",
    "Visit",
    "Lead",
    "Expense",
    "Dealer",
    "Distributor",
    "Supplier",
    "Labour",
    "Product",
    "Brand",
    "Category",
    "Unit",
    "Market",
    "Region",
    "RefreshToken",
]

# Public schema tables (PascalCase)
PUBLIC_ACCESS_TABLE = "UserWarehouseAccess"
PUBLIC_USER_TABLE = "User"
PUBLIC_COMPANY_TABLE = "Company"
PUBLIC_WAREHOUSE_TABLE = "Warehouse"


def get_connection():
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set!")
        sys.exit(1)

    parsed = urlparse(db_url)
    safe = db_url.replace(parsed.password or "", "****") if parsed.password else db_url
    print(f"Connecting to: {safe}")

    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        connect_timeout=20,
        sslmode="require",
    )
    conn.autocommit = False
    print("Connected!\n")
    return conn


def get_tenant_schemas(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT schema_name FROM information_schema.schemata
            WHERE schema_name LIKE 'wh_%'
            ORDER BY schema_name;
        """)
        return [r[0] for r in cur.fetchall()]


def wipe_tenant_schema(conn, schema):
    print(f"  Wiping tenant schema: {schema}")
    try:
        with conn.cursor() as cur:
            for table in TENANT_TABLES:
                # Check table exists
                cur.execute("""
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = %s;
                """, (schema, table))
                if cur.fetchone():
                    cur.execute(
                        sql.SQL("TRUNCATE TABLE {}.{} RESTART IDENTITY CASCADE;").format(
                            sql.Identifier(schema),
                            sql.Identifier(table)
                        )
                    )
                    print(f"    OK: Truncated {schema}.{table}")

        conn.commit()
        print(f"  SUCCESS: {schema} is now empty.\n")
    except Exception as e:
        conn.rollback()
        print(f"  ERROR wiping {schema}: {e}\n")


def wipe_public_schema(conn):
    print("  Cleaning public schema...")
    try:
        with conn.cursor() as cur:
            # Clear all warehouse access links
            cur.execute(sql.SQL("DELETE FROM {};").format(sql.Identifier(PUBLIC_ACCESS_TABLE)))
            print("    OK: Cleared UserWarehouseAccess")

            # Delete all users except superadmin
            cur.execute(
                sql.SQL("DELETE FROM {} WHERE email != %s;").format(sql.Identifier(PUBLIC_USER_TABLE)),
                (SUPERADMIN_EMAIL,)
            )
            print("    OK: Removed non-superadmin users")

            # Hash new password
            hashed = bcrypt.hashpw(SUPERADMIN_PASSWORD.encode(), bcrypt.gensalt(10)).decode()

            # Check if superadmin exists
            cur.execute(
                sql.SQL("SELECT id FROM {} WHERE email = %s;").format(sql.Identifier(PUBLIC_USER_TABLE)),
                (SUPERADMIN_EMAIL,)
            )
            row = cur.fetchone()

            if row:
                super_id = row[0]
                cur.execute(
                    sql.SQL("UPDATE {} SET hashedpassword = %s, active = true, role = 'SUPERADMIN' WHERE email = %s;")
                    .format(sql.Identifier(PUBLIC_USER_TABLE)),
                    (hashed, SUPERADMIN_EMAIL)
                )
                print(f"    OK: Reset password for {SUPERADMIN_EMAIL}")
            else:
                # Get company id
                cur.execute(sql.SQL("SELECT id FROM {} LIMIT 1;").format(sql.Identifier(PUBLIC_COMPANY_TABLE)))
                company_row = cur.fetchone()
                company_id = company_row[0] if company_row else None

                super_id = "c" + uuid.uuid4().hex[:23]
                cur.execute(
                    sql.SQL("""
                        INSERT INTO {} (id, email, name, hashedpassword, role, active, companyid_id)
                        VALUES (%s, %s, %s, %s, 'SUPERADMIN', true, %s);
                    """).format(sql.Identifier(PUBLIC_USER_TABLE)),
                    (super_id, SUPERADMIN_EMAIL, SUPERADMIN_NAME, hashed, company_id)
                )
                print(f"    OK: Created superadmin: {SUPERADMIN_EMAIL}")

            # Re-link superadmin to all warehouses
            cur.execute(sql.SQL("SELECT id, name FROM {};").format(sql.Identifier(PUBLIC_WAREHOUSE_TABLE)))
            warehouses = cur.fetchall()

            for wh_id, wh_name in warehouses:
                link_id = "c" + uuid.uuid4().hex[:23]
                cur.execute(
                    sql.SQL("INSERT INTO {} (id, userid_id, warehouseid_id) VALUES (%s, %s, %s);")
                    .format(sql.Identifier(PUBLIC_ACCESS_TABLE)),
                    (link_id, super_id, wh_id)
                )
                print(f"    OK: Linked superadmin to warehouse: {wh_name}")

        conn.commit()
        print("  SUCCESS: Public schema cleaned.\n")
    except Exception as e:
        conn.rollback()
        print(f"  ERROR in public schema: {e}\n")


def main():
    print("=" * 60)
    print("  RENDER PRODUCTION DATABASE WIPE")
    print("=" * 60)
    print()

    conn = get_connection()

    try:
        schemas = get_tenant_schemas(conn)
        if schemas:
            print(f"Found {len(schemas)} tenant schema(s): {', '.join(schemas)}\n")
            for schema in schemas:
                wipe_tenant_schema(conn, schema)
        else:
            print("WARNING: No wh_* schemas found!")

        wipe_public_schema(conn)

        print("=" * 60)
        print("  DONE! Render database is clean.")
        print(f"  Login: {SUPERADMIN_EMAIL} / {SUPERADMIN_PASSWORD}")
        print("=" * 60)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
