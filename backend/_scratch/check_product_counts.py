import psycopg2

db_url = "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    # Get all schemas
    cursor.execute("SELECT schema_name FROM information_schema.schemata;")
    schemas = [row[0] for row in cursor.fetchall()]
    
    print("--- Product counts per schema ---")
    total = 0
    for schema in schemas:
        if schema.startswith('pg_') or schema == 'information_schema':
            continue
            
        try:
            cursor.execute(f'SELECT count(*) FROM {schema}."Product";')
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"Schema '{schema}': {count} products")
                total += count
        except Exception as e:
            conn.rollback() # reset transaction on error
            
    if total == 0:
        print("No products found in any schema.")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
