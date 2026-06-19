"""
Render/Supabase Direct Database Wipe Script
=============================================
Connects directly using psycopg2 (no Django needed).
Finds ALL tenant schemas (wh_*) and wipes every table in each one.
Also resets the superadmin user in the public schema.

Usage:
  Set DATABASE_URL environment variable, then run:
    python scratch/wipe_supabase_direct.py

  OR pass URL directly in script (edit MANUAL_DB_URL below).
"""

import os
import sys
import psycopg2
from psycopg2 import sql
import uuid
import bcrypt
from urllib.parse import urlparse

# ---- EDIT THIS if you want to hardcode the Render DB URL ----
MANUAL_DB_URL = ""
# Example: "postgresql://simply_user:PASSWORD@HOST/simply_useful"
# Leave empty to use DATABASE_URL environment variable
# -------------------------------------------------------------

SUPERADMIN_EMAIL = "super@kamla.com"
SUPERADMIN_PASSWORD = "admin123"
SUPERADMIN_NAME = "Kamla Super Admin"

# Tables to wipe inside each tenant (wh_*) schema -- in dependency order
TENANT_TABLES = [
    "api_userproductaccess",
    "api_bomitem",
    "api_bom",
    "api_inventory",
    "api_stocktransaction",
    "api_orderitem",
    "api_order",
    "api_purchaseitem",
    "api_purchase",
    "api_purchaseorderitem",
    "api_purchaseorder",
    "api_visit",
    "api_lead",
    "api_expense",
    "api_dealer",
    "api_distributor",
    "api_supplier",
    "api_product",
    "api_brand",
    "api_subcategory",
    "api_category",
    "api_unit",
]


def get_connection(db_url):
    print("Connecting to database...")
    parsed = urlparse(db_url)
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
    print("Connected successfully!\n")
    return conn


def get_tenant_schemas(conn):
    """Find all schemas that start with 'wh_'."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name LIKE 'wh_%'
            ORDER BY schema_name;
        """)
        return [row[0] for row in cur.fetchall()]


def get_existing_tables(conn, schema):
    """Get set of table names that actually exist in this schema."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE';
        """, (schema,))
        return {row[0] for row in cur.fetchall()}


def wipe_tenant_schema(conn, schema):
    """Delete all data from every known table in a tenant schema."""
    print(f"  Wiping schema: {schema}")
    existing = get_existing_tables(conn, schema)
    tables_to_wipe = [t for t in TENANT_TABLES if t in existing]

    if not tables_to_wipe:
        print(f"    WARNING: No matching tables found in {schema}, skipping.")
        return

    try:
        with conn.cursor() as cur:
            for table in tables_to_wipe:
                cur.execute(
                    sql.SQL("TRUNCATE TABLE {}.{} RESTART IDENTITY CASCADE;").format(
                        sql.Identifier(schema),
                        sql.Identifier(table)
                    )
                )
                print(f"    OK: Truncated {schema}.{table}")

        conn.commit()
        print(f"  SUCCESS: Schema {schema} wiped.\n")
    except Exception as e:
        conn.rollback()
        print(f"  ERROR wiping schema {schema}: {e}\n")


def wipe_public_schema(conn):
    """Clean up users and access links in the public schema."""
    print("  Cleaning public schema (users, warehouse access)...")
    try:
        with conn.cursor() as cur:
            # Remove all warehouse access links
            cur.execute("DELETE FROM core_userwarehouseaccess;")
            print("    OK: Cleared core_userwarehouseaccess")

            # Remove all users except superadmin
            cur.execute("DELETE FROM core_user WHERE email != %s;", (SUPERADMIN_EMAIL,))
            print("    OK: Removed non-superadmin users")

            # Hash password
            hashed = bcrypt.hashpw(
                SUPERADMIN_PASSWORD.encode(), bcrypt.gensalt(10)
            ).decode()

            cur.execute("SELECT id FROM core_user WHERE email = %s;", (SUPERADMIN_EMAIL,))
            row = cur.fetchone()

            if row:
                cur.execute("""
                    UPDATE core_user
                    SET hashedpassword = %s, active = true, role = 'SUPERADMIN'
                    WHERE email = %s;
                """, (hashed, SUPERADMIN_EMAIL))
                super_id = row[0]
                print(f"    OK: Reset superadmin password for {SUPERADMIN_EMAIL}")
            else:
                super_id = "c" + uuid.uuid4().hex[:23]
                cur.execute("SELECT id FROM core_company LIMIT 1;")
                company_row = cur.fetchone()
                company_id = company_row[0] if company_row else None

                cur.execute("""
                    INSERT INTO core_user (id, email, name, hashedpassword, role, active, companyid_id)
                    VALUES (%s, %s, %s, %s, 'SUPERADMIN', true, %s);
                """, (super_id, SUPERADMIN_EMAIL, SUPERADMIN_NAME, hashed, company_id))
                print(f"    OK: Created superadmin: {SUPERADMIN_EMAIL}")

            # Re-link superadmin to all warehouses
            cur.execute("SELECT id, name FROM core_warehouse;")
            warehouses = cur.fetchall()
            for wh_id, wh_name in warehouses:
                link_id = "c" + uuid.uuid4().hex[:23]
                try:
                    cur.execute("""
                        INSERT INTO core_userwarehouseaccess (id, userid_id, warehouseid_id)
                        VALUES (%s, %s, %s);
                    """, (link_id, super_id, wh_id))
                    print(f"    OK: Linked superadmin to warehouse: {wh_name}")
                except Exception:
                    conn.rollback()
                    print(f"    WARN: Could not link to warehouse {wh_name}")

        conn.commit()
        print("  SUCCESS: Public schema cleaned.\n")
    except Exception as e:
        conn.rollback()
        print(f"  ERROR cleaning public schema: {e}\n")


def main():
    print("=" * 60)
    print("  RENDER DATABASE WIPE SCRIPT")
    print("=" * 60)
    print()

    # Resolve DB URL
    db_url = MANUAL_DB_URL or os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: No DATABASE_URL found!")
        print()
        print("Either:")
        print("  1. Set MANUAL_DB_URL at the top of this script")
        print("  2. Run: $env:DATABASE_URL='your-render-db-url'; python scratch/wipe_supabase_direct.py")
        sys.exit(1)

    # Mask password in log
    parsed = urlparse(db_url)
    safe_url = db_url.replace(parsed.password or "", "****") if parsed.password else db_url
    print(f"Target DB: {safe_url}\n")

    conn = get_connection(db_url)

    try:
        # 1. Find all tenant schemas
        schemas = get_tenant_schemas(conn)
        if schemas:
            print(f"Found {len(schemas)} tenant schema(s): {', '.join(schemas)}\n")
            for schema in schemas:
                wipe_tenant_schema(conn, schema)
        else:
            print("WARNING: No tenant schemas (wh_*) found!\n")

        # 2. Clean public schema
        wipe_public_schema(conn)

        print("=" * 60)
        print("  ALL DONE - Database is clean!")
        print("  Login: super@kamla.com / admin123")
        print("=" * 60)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
