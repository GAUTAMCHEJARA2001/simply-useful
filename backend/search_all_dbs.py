import os
import sys
import psycopg2

db_user = os.environ.get('DATABASE_USER', 'postgres')
db_password = os.environ.get('DATABASE_PASSWORD', 'admin')
db_host = os.environ.get('DATABASE_HOST', 'localhost')
db_port = os.environ.get('DATABASE_PORT', '5432')

print("--- Searching selectively in db_master ---")

try:
    conn = psycopg2.connect(
        dbname='db_master',
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Get all schemas
    cursor.execute("SELECT schema_name FROM information_schema.schemata")
    schemas = [r[0] for r in cursor.fetchall() if not r[0].startswith('pg_') and r[0] != 'information_schema']
    
    for schema in schemas:
        cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}'")
        tables = [r[0] for r in cursor.fetchall()]
        
        for table in tables:
            if 'Expense' in table or 'User' in table or 'Visit' in table:
                cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}'")
                cols = [r[0] for r in cursor.fetchall()]
                
                # Exclude columns that might contain large base64 data
                cols_to_select = [c for c in cols if 'photo' not in c.lower() and 'image' not in c.lower() and 'proof' not in c.lower()]
                cols_str = ", ".join(f'"{c}"' for c in cols_to_select)
                
                try:
                    cursor.execute(f'SELECT {cols_str} FROM "{schema}"."{table}"')
                    rows = cursor.fetchall()
                    for r in rows:
                        r_str = str(r).lower()
                        if 'pritika' in r_str or '500' in r_str or 'surat' in r_str:
                            row_dict = dict(zip(cols_to_select, r))
                            print(f"FOUND MATCH in Schema '{schema}', Table '{table}':")
                            print(f"  {row_dict}")
                except Exception as e:
                    pass
    conn.close()
except Exception as ex:
    print(f"Error: {ex}")
