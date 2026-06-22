import os
import sys
sys.path.insert(0, os.getcwd())

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# Query all databases on the localhost Postgres instance
cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false")
dbs = [r[0] for r in cursor.fetchall()]
print(f"All databases on this PostgreSQL host: {dbs}")
