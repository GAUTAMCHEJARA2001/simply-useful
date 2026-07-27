import os
import time
import subprocess
import requests
import json
import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

# 1. Temporarily update .env to point to production DB
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
original_env = ""
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        original_env = f.read()

new_env = original_env.replace(
    'DATABASE_URL="postgresql://postgres.fzwtawqtoahlevexzgvx:G@ut@m1306200@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?pgbouncer=true"',
    f'DATABASE_URL="{db_url}"'
)
with open(env_path, "w") as f:
    f.write(new_env)

print("--- Starting Local Django Server ---")
django_process = subprocess.Popen(
    ["python", "manage.py", "runserver", "8000"],
    cwd=os.path.join(os.path.dirname(__file__), "..")
)

time.sleep(5)  # Wait for server to start

try:
    print("\n--- 1. Testing Bulk Import Dealer (HTTP POST) ---")
    csv_data = "dealerCode,dealerName,city,assignedSoEmail,active\nDLR-TEST-999,Test Global Dealer,New York,test@example.com,true\n"
    files = {'file': ('dealers.csv', csv_data, 'text/csv')}
    
    # We might need an auth token or X-Warehouse-ID if the middleware expects it.
    # But wait, middleware defaults to the first active warehouse if not provided, 
    # except we EXEMPTED /dealers from the warehouse middleware!
    headers = {}
    
    # In urls.py, bulk_import is not explicitly protected by @permission_classes([IsAuthenticated]) 
    # but let's check.
    response = requests.post("http://localhost:8000/api/v1/bulk/dealers/import", files=files)
    print(f"Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    print("\n--- 2. Verifying Dealer in Public Schema (Direct DB) ---")
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute('SELECT "dealerCode", "dealerName" FROM "Dealer" WHERE "dealerCode" = %s;', ('DLR-TEST-999',))
    dealer = cursor.fetchone()
    if dealer:
        print(f"✅ SUCCESS: Found dealer in public.\"Dealer\" table: {dealer[0]} - {dealer[1]}")
    else:
        print("❌ FAILED: Dealer not found in public schema.")
        
    # Clean up test dealer
    if dealer:
        cursor.execute('DELETE FROM "Dealer" WHERE "dealerCode" = %s;', ('DLR-TEST-999',))
        conn.commit()
        print("Cleaned up test dealer.")
        
    conn.close()
    
    print("\n--- 3. Testing Database Export (HTTP GET) ---")
    response_export = requests.get("http://localhost:8000/api/v1/system/database-export")
    if response_export.status_code == 200:
        data = response_export.json()
        print(f"Export returned {len(data.get('dealers', []))} dealers from public schema.")
    else:
        print(f"Export failed: {response_export.status_code} {response_export.text}")

finally:
    print("\n--- Cleaning up ---")
    django_process.terminate()
    django_process.wait()
    
    with open(env_path, "w") as f:
        f.write(original_env)
    print("Restored .env")
