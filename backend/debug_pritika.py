import os
import sys
sys.path.insert(0, os.getcwd())

# Load .env variables
from pathlib import Path
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key] = val.strip('"\'')

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# Get all schemas in the active database
cursor.execute("SELECT schema_name FROM information_schema.schemata")
schemas = [r[0] for r in cursor.fetchall() if not r[0].startswith('pg_') and r[0] != 'information_schema']
print(f"All database schemas in Supabase: {schemas}")

for schema in schemas:
    try:
        # Get all tables in this schema
        cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}'")
        tables = [r[0] for r in cursor.fetchall()]
        
        for table in tables:
            # Check column names
            cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}'")
            cols = [r[0] for r in cursor.fetchall()]
            
            if 'Expense' in table or 'User' in table or 'Visit' in table:
                cursor.execute(f'SELECT * FROM "{schema}"."{table}"')
                rows = cursor.fetchall()
                if len(rows) > 0:
                    for r in rows:
                        r_str = str(r).lower()
                        if 'pritika' in r_str or '500' in r_str or 'surat' in r_str:
                            row_dict = dict(zip(cols, r))
                            print(f"\nFOUND MATCH in schema '{schema}', table '{table}':")
                            print(f"  {row_dict}")
    except Exception as e:
        print(f"Error querying schema {schema}: {e}")
        connection.rollback()
