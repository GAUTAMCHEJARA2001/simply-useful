import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

def copy_table(cursor, table_name, source_schema="wh_navsari_factory", target_schema="public"):
    print(f"Copying {table_name} from {source_schema} to {target_schema}...")
    
    # Check if table exists in public schema
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '{target_schema}' AND table_name = '{table_name}'
        );
    """)
    exists = cursor.fetchone()[0]
    
    if not exists:
        print(f"Creating table {table_name} in {target_schema} schema...")
        cursor.execute(f'CREATE TABLE {target_schema}."{table_name}" (LIKE {source_schema}."{table_name}" INCLUDING ALL);')
    else:
        print(f"Table {table_name} already exists in {target_schema} schema. Truncating...")
        cursor.execute(f'TRUNCATE {target_schema}."{table_name}" CASCADE;')
        
    print(f"Inserting data into {target_schema}.{table_name}...")
    cursor.execute(f'INSERT INTO {target_schema}."{table_name}" SELECT * FROM {source_schema}."{table_name}";')
    
    cursor.execute(f'SELECT COUNT(*) FROM {target_schema}."{table_name}";')
    count = cursor.fetchone()[0]
    print(f"Done! {count} rows in {target_schema}.{table_name}\n")

try:
    conn = psycopg2.connect(db_url)
    # Enable autocommit for creating tables safely or do it in a transaction
    cursor = conn.cursor()
    
    tables_to_copy = ['Category', 'Brand', 'Unit', 'Product']
    
    for t in tables_to_copy:
        copy_table(cursor, t)
        
    conn.commit()
    print("All tables copied successfully!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
