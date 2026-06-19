"""Add settingsJson column to Company table on Render DB."""
import os, psycopg2
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(db_url)
conn = psycopg2.connect(
    host=parsed.hostname, port=parsed.port or 5432,
    dbname=parsed.path.lstrip("/"), user=parsed.username,
    password=parsed.password, sslmode="require",
)
conn.autocommit = True
cur = conn.cursor()

# Check if column already exists
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Company' AND column_name = 'settingsJson';
""")
if cur.fetchone():
    print("Column 'settingsJson' already exists on Company table. Nothing to do.")
else:
    cur.execute('ALTER TABLE "Company" ADD COLUMN "settingsJson" text DEFAULT \'{}\';')
    print("Added 'settingsJson' column to Company table.")

# Also record the migration as applied so Django doesn't try to re-run it
cur.execute("""
    SELECT 1 FROM django_migrations WHERE app = 'core' AND name = '0003_add_settings_json_to_company';
""")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('core', '0003_add_settings_json_to_company', NOW());
    """)
    print("Recorded migration 0003 as applied in django_migrations.")
else:
    print("Migration 0003 already recorded.")

cur.close()
conn.close()
print("Done!")
