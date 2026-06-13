import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.db import connections

for db_name in ['wh_sur', 'wh_mum']:
    try:
        cursor = connections[db_name].cursor()
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"\n=== Tables in {db_name} ===")
        for t in sorted(tables):
            print(f"  {t}")
    except Exception as e:
        print(f"\n=== {db_name}: ERROR: {e} ===")
