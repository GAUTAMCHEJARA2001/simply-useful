import psycopg2

DB_URL = "postgresql://simply_useful_db_uiha_user:H5ZpuQs68VZwT1gLPaAsUoSt2XmNwH5B@dpg-d96ascm7r5hc7383u77g-a.singapore-postgres.render.com/simply_useful_db_uiha"

def run():
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM public."Order";')
    print('Total Orders:', cursor.fetchone()[0])
    cursor.execute('SELECT COUNT(*) FROM public."Order" WHERE "warehouseId" IS NULL;')
    print('Null Warehouse Orders:', cursor.fetchone()[0])

    cursor.execute('SELECT COUNT(*) FROM wh_navsari_factory."Order";')
    print('Navsari Orders:', cursor.fetchone()[0])

    cursor.execute('SELECT p.id, n.id FROM public."Order" p JOIN wh_navsari_factory."Order" n ON p.id = n.id LIMIT 1;')
    print('Match example:', cursor.fetchone())

if __name__ == '__main__':
    run()
