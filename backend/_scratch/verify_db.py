import os
import time
import requests
import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

print("--- Testing Database Direct Connection ---")
try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    # Check current dealers in public schema
    cursor.execute('SELECT dealerCode, dealerName FROM "Dealer" LIMIT 5;')
    dealers = cursor.fetchall()
    print(f"Current dealers in public.\"Dealer\" table: {len(dealers)}")
    for d in dealers:
        print(f" - {d[0]}: {d[1]}")
        
    conn.close()
    print("Database connection successful and public.Dealer table is accessible.\n")
except Exception as e:
    print(f"DB Error: {e}")

