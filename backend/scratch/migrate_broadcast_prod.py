"""
Run the Broadcast table migration on the production database.
Creates the 'Broadcast' table in the public schema.
"""
import os
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("ERROR: DATABASE_URL not set!")
    exit(1)

# Parse using Django's same method (from settings.py)
clean_url = db_url.strip('"').strip("'")
# Remove query params before parsing
base_url = clean_url.split('?')[0] if '?' in clean_url else clean_url
url = urlparse(base_url)

db_params = {
    'dbname': url.path[1:],
    'user': unquote(url.username or ''),
    'password': unquote(url.password or ''),
    'host': url.hostname,
    'port': url.port or 5432,
}

print(f"Connecting to production DB at {db_params['host']}:{db_params['port']}/{db_params['dbname']}...")

try:
    conn = psycopg2.connect(**db_params)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check if table already exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'Broadcast'
        );
    """)
    exists = cur.fetchone()[0]
    
    if exists:
        print("[OK] 'Broadcast' table already exists in public schema. No action needed.")
    else:
        print("Creating 'Broadcast' table in public schema...")
        cur.execute("""
            CREATE TABLE "Broadcast" (
                "id" varchar(40) PRIMARY KEY,
                "message" text NOT NULL,
                "targetRole" varchar(30) NOT NULL DEFAULT 'ALL',
                "author" varchar(100) NOT NULL DEFAULT 'Admin',
                "companyId" text REFERENCES "Company"("id") ON DELETE NO ACTION,
                "createdAt" timestamptz NOT NULL DEFAULT NOW(),
                "active" boolean NOT NULL DEFAULT true
            );
        """)
        
        # Add indexes for faster queries
        cur.execute("""
            CREATE INDEX "idx_broadcast_company_active" ON "Broadcast" ("companyId", "active");
        """)
        cur.execute("""
            CREATE INDEX "idx_broadcast_created" ON "Broadcast" ("createdAt" DESC);
        """)
        
        print("[OK] 'Broadcast' table created successfully in public schema!")
    
    # Verify
    cur.execute("""SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Broadcast' AND table_schema = 'public' ORDER BY ordinal_position;""")
    cols = cur.fetchall()
    print(f"\nBroadcast table columns ({len(cols)}):")
    for col_name, col_type in cols:
        print(f"  - {col_name} ({col_type})")
    
    print("\n[DONE] Migration complete! Broadcast notifications are now ready.")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"[ERROR] {e}")
    exit(1)
