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

# Get all schemas
cursor.execute("SELECT schema_name FROM information_schema.schemata")
schemas = [r[0] for r in cursor.fetchall() if not r[0].startswith('pg_') and r[0] != 'information_schema']

for schema in schemas:
    try:
        # Check User table
        cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}' AND table_name = 'User'")
        if cursor.fetchone():
            cursor.execute(f'SELECT "id", "email", "name" FROM "{schema}"."User"')
            rows = cursor.fetchall()
            print(f"\nSupabase schema '{schema}', table 'User' ({len(rows)} rows):")
            for r in rows:
                print(f"  - {r}")
                
        # Check Expense table
        cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}' AND table_name = 'Expense'")
        if cursor.fetchone():
            cursor.execute(f'SELECT "id", "soEmail", "category", "amount", "remarks" FROM "{schema}"."Expense"')
            rows = cursor.fetchall()
            print(f"Supabase schema '{schema}', table 'Expense' ({len(rows)} rows):")
            for r in rows:
                print(f"  - {r}")
    except Exception as e:
        print(f"Error querying schema {schema}: {e}")
        connection.rollback()
