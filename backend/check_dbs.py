import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT datname FROM pg_database WHERE datistemplate = false;')
    print([db[0] for db in cursor.fetchall()])
