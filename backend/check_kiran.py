import sqlite3
import json

conn = sqlite3.connect('d:/cost 2/simply-useful/simply-useful/simply-useful/backend/db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT id, email, role, companyId FROM User WHERE name LIKE '%kiran%'")
user = cur.fetchone()
print('User:', dict(user) if user else 'Not found')

if user:
    cur.execute("SELECT COUNT(*) FROM Product WHERE companyId = ?", (user['companyId'],))
    count = cur.fetchone()[0]
    print(f'Products for company {user["companyId"]}:', count)
    
    cur.execute("SELECT * FROM UserProductAccess WHERE userId = ?", (user['id'],))
    access = cur.fetchall()
    print('Product Access records:', len(access))
