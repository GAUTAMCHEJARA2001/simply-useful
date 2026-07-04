import psycopg2

conn = psycopg2.connect('postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres')
cur = conn.cursor()

# List ALL tables in public schema
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
print('All public tables:')
for r in cur.fetchall():
    print(f'  {r[0]}')

# List all tables in wh_main
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'wh_main' ORDER BY tablename")
print('\nAll wh_main tables:')
for r in cur.fetchall():
    print(f'  {r[0]}')

# Try case-insensitive search
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%stock%'")
print('\nStock-like tables:', cur.fetchall())

conn.close()
