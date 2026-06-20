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

def list_schemas():
    print("Database Settings from connection:")
    print(f"  - Engine: {connection.settings_dict.get('ENGINE')}")
    print(f"  - Name: {connection.settings_dict.get('NAME')}")
    print(f"  - Host: {connection.settings_dict.get('HOST')}")
    print(f"  - Port: {connection.settings_dict.get('PORT')}")
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata;")
        schemas = [r[0] for r in cursor.fetchall()]
        print("\nAll schemas in database:")
        for s in sorted(schemas):
            print(f"  - {s}")
            
if __name__ == '__main__':
    list_schemas()
