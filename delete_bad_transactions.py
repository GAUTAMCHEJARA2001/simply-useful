import psycopg2

conn = psycopg2.connect('postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres')
cur = conn.cursor()

for schema in ['wh_main', 'wh_navsari_factory']:
    cur.execute(f'SET search_path TO {schema}, public')
    
    cur.execute('SELECT COUNT(*) FROM "StockTransaction" WHERE reason = %s', ('OPENING_STOCK_BULK_IMPORT',))
    count = cur.fetchone()[0]
    print(f'{schema}: {count} OPENING_STOCK_BULK_IMPORT transactions')
    
    if count > 0:
        cur.execute('SELECT id, "productId", "quantity", "transactionType" FROM "StockTransaction" WHERE reason = %s LIMIT 5', ('OPENING_STOCK_BULK_IMPORT',))
        for r in cur.fetchall():
            print(f'  id={r[0]}, product={r[1]}, qty={r[2]}, type={r[3]}')
        
        cur.execute('DELETE FROM "StockTransaction" WHERE reason = %s', ('OPENING_STOCK_BULK_IMPORT',))
        print(f'  Deleted {cur.rowcount} rows')
    
    cur.execute('RESET search_path')

conn.commit()
conn.close()
print('Done!')
