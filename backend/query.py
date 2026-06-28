import sqlite3
import os
import glob

dbs = glob.glob('*.sqlite3')
for db in dbs:
    print(f"--- DB: {db} ---")
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%dealer%';")
        tables = cur.fetchall()
        print("Tables:", tables)
        for t in tables:
            t_name = t[0]
            cur.execute(f"SELECT dealercode, dealername, active FROM {t_name} LIMIT 10;")
            print(f"Data in {t_name}:", cur.fetchall())
    except Exception as e:
        print("Error:", e)
