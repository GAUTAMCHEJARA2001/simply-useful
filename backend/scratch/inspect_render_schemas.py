"""
Inspect Render Database Schema Tables
Lists all tables in every wh_* schema and public schema.
"""
import os
import psycopg2
from urllib.parse import urlparse

DB_URL = os.environ.get("DATABASE_URL", "")

def main():
    parsed = urlparse(DB_URL)
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        connect_timeout=20,
        sslmode="require",
    )
    cur = conn.cursor()

    # Get all schemas
    cur.execute("""
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
        ORDER BY schema_name;
    """)
    schemas = [r[0] for r in cur.fetchall()]
    print(f"All schemas: {schemas}\n")

    for schema in schemas:
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """, (schema,))
        tables = [r[0] for r in cur.fetchall()]
        if tables:
            print(f"Schema [{schema}] ({len(tables)} tables):")
            for t in tables:
                print(f"  - {t}")
        else:
            print(f"Schema [{schema}]: (empty)")
        print()

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
