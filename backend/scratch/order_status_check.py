import os, psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv
load_dotenv()
db_url = os.environ.get('DATABASE_URL','').strip('"').strip("'")
base_url = db_url.split('?')[0]
url = urlparse(base_url)
conn = psycopg2.connect(dbname=url.path[1:], user=unquote(url.username or ''), password=unquote(url.password or ''), host=url.hostname, port=url.port or 5432)
cur = conn.cursor()
cur.execute("SELECT schema_name FROM \"Warehouse\" WHERE active=true AND schema_name IS NOT NULL AND schema_name != 'public'")
for (schema,) in cur.fetchall():
    cur.execute(f'SELECT status, COUNT(*) FROM "{schema}"."Order" GROUP BY status ORDER BY COUNT(*) DESC')
    rows = cur.fetchall()
    print(f'Order status breakdown in {schema}:')
    for status, cnt in rows:
        print(f'  {status}: {cnt}')
    print(f'  TOTAL: {sum(c for _,c in rows)}')
conn.close()
