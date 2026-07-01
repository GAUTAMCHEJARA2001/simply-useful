import pypyodbc as pyodbc
import requests
import time
import json
import traceback
from datetime import datetime

# CONFIGURATION
DB_PATH = r"C:\BusyWin\DATA\COMP0010\db12026.bds"
DB_PASSWORD = "ILoveMyINDIA"
API_ENDPOINT = "https://simply-useful.vercel.app/api/busy/sync"
# If running locally for testing, change to:
# API_ENDPOINT = "http://localhost:8000/api/busy/sync"
TENANT_DB = "wh_navsari" # Assuming they are using the primary tenant 'wh_navsari'. Change if needed.

def sync_busy_data():
    conn_str = f"Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={DB_PATH};Pwd={DB_PASSWORD};"
    
    try:
        print(f"Connecting to {DB_PATH}...")
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # 1. Fetch Parties (MasterType = 2)
        print("Fetching Parties...")
        cursor.execute("SELECT Code, Name, Alias FROM Master1 WHERE MasterType = 2")
        parties = []
        for row in cursor.fetchall():
            parties.append({
                'code': row[0],
                'name': row[1] if row[1] else 'Unknown',
                'alias': row[2] if row[2] else ''
            })
            
        print(f"Found {len(parties)} parties.")
        
        # 2. Fetch Ledger Entries (RecType = 1)
        print("Fetching Ledger Entries...")
        # To avoid massive memory usage, we might only fetch the last year, 
        # but for now we fetch all since we bulk replace.
        cursor.execute("""
            SELECT t.MasterCode1, t.Date, t.VchType, t.VchNo, t.Value1, t.ShortNar 
            FROM Tran2 t
            INNER JOIN Master1 m ON t.MasterCode1 = m.Code
            WHERE t.RecType = 1 AND m.MasterType = 2
        """)
        ledgers = []
        for row in cursor.fetchall():
            date_str = row[1].strftime('%Y-%m-%d') if row[1] else None
            if not date_str: continue
            
            ledgers.append({
                'party_code': row[0],
                'date': date_str,
                'vch_type': row[2],
                'vch_no': row[3] if row[3] else '',
                'amount': float(row[4] or 0.0),
                'short_nar': row[5] if row[5] else ''
            })
            
        print(f"Found {len(ledgers)} ledger entries.")
        conn.close()
        
        # 3. Post to API
        payload = {
            'tenant_db': TENANT_DB,
            'parties': parties,
            'ledgers': ledgers
        }
        
        print(f"Pushing to {API_ENDPOINT}...")
        headers = {'Content-Type': 'application/json'}
        # Using json parameter or data with json.dumps
        response = requests.post(API_ENDPOINT, json=payload, headers=headers)
        
        if response.status_code == 200:
            print("Sync successful!")
            print(response.json())
        else:
            print(f"Sync failed! Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print("Error during sync:")
        print(traceback.format_exc())

if __name__ == "__main__":
    while True:
        print(f"\n--- Starting Sync at {datetime.now()} ---")
        sync_busy_data()
        print("Waiting 10 minutes for next sync...")
        time.sleep(600) # Sync every 10 minutes
