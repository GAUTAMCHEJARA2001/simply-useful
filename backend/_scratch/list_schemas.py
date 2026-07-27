import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def run():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'Dealer' OR table_name = 'api_dealer';
        """)
        rows = cursor.fetchall()
        print("Tables named 'Dealer' or 'api_dealer':")
        for row in rows:
            print(f"- Schema: {row[0]}, Table: {row[1]}")

if __name__ == '__main__':
    run()
