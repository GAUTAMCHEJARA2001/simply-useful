import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connections
from api.models import Warehouse

tenant_dbs = {wh.id: 'wh_' + wh.name.lower().replace(' ', '_') for wh in Warehouse.objects.using('default').all() if wh.id in [4, 5]}

tables = ['Category', 'Brand', 'Unit', 'Supplier', 'Labour', 'Dealer', 'Distributor', 'Product']

for db_alias in tenant_dbs.values():
    with connections[db_alias].cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f'ALTER TABLE "{table}" DROP COLUMN "defaultWarehouseId"')
                print(f'Dropped defaultWarehouseId from {table} in {db_alias}')
            except Exception as e:
                print(f'Error dropping from {table} in {db_alias}: {e}')
                connections[db_alias].rollback()
