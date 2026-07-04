import psycopg2

conn = psycopg2.connect('postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres')
cur = conn.cursor()

# Check dealers in public
cur.execute('SELECT COUNT(*) FROM "Dealer"')
print(f'Public Dealer count: {cur.fetchone()[0]}')

# Show recent dealers
cur.execute('SELECT id, "dealerCode", "dealerName", "companyId", "createdAt" FROM "Dealer" ORDER BY "createdAt" DESC LIMIT 5')
rows = cur.fetchall()
print('\nRecent dealers:')
for r in rows:
    print(f'  id={r[0]}, code={r[1]}, name={r[2]}, company={r[3]}, created={r[4]}')

# Check company IDs in users
cur.execute('SELECT id, email, role, "companyId" FROM "User" LIMIT 5')
print('\nUsers:')
for r in cur.fetchall():
    print(f'  id={r[0]}, email={r[1]}, role={r[2]}, company={r[3]}')

# Check Company table
cur.execute('SELECT id, name FROM "Company"')
print('\nCompanies:')
for r in cur.fetchall():
    print(f'  id={r[0]}, name={r[1]}')

conn.close()
