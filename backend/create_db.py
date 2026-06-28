import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    # Connect to the default postgres database to create a new one
    conn = psycopg2.connect(
        dbname='postgres',
        user='postgres',
        password='admin',
        host='localhost',
        port='5432'
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'db_master'")
    exists = cursor.fetchone()
    
    if not exists:
        cursor.execute('CREATE DATABASE db_master')
        print("Successfully created database 'db_master'!")
    else:
        print("Database 'db_master' already exists.")
        
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
