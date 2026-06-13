import sqlite3
import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps


def get_field_db_type(field):
    internal_type = field.get_internal_type()
    if internal_type in ('CharField', 'TextField', 'EmailField', 'UUIDField'):
        return 'TEXT'
    elif internal_type in ('IntegerField', 'SmallIntegerField', 'BigIntegerField', 'BooleanField'):
        return 'INTEGER'
    elif internal_type in ('FloatField', 'DecimalField'):
        return 'REAL'
    elif internal_type in ('DateTimeField', 'DateField'):
        return 'DATETIME'
    return 'TEXT'


def sync():
    db_url = os.environ.get('DATABASE_URL')
    if db_url and (db_url.startswith('postgres://') or db_url.startswith('postgresql://')):
        print("PostgreSQL detected. Skipping SQLite schema sync.")
        return

    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db.sqlite3')
    print(f"Target SQLite database path: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all models in our api app
    api_app = apps.get_app_config('api')
    models = api_app.get_models()

    for model in models:
        table_name = model._meta.db_table
        # Check if table exists in SQLite
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        if not cursor.fetchone():
            continue

        # Get existing columns in SQLite (case-insensitive keys for comparison)
        cursor.execute(f"PRAGMA table_info(\"{table_name}\")")
        existing_cols = {col[1].lower(): col[1] for col in cursor.fetchall()}

        # Check Django fields
        for field in model._meta.fields:
            if not field.concrete:
                continue

            db_column = field.db_column or field.name
            if db_column.lower() not in existing_cols:
                db_type = get_field_db_type(field)
                alter_sql = f"ALTER TABLE \"{table_name}\" ADD COLUMN \"{db_column}\" {db_type};"
                print(f"Applying: {alter_sql}")
                try:
                    cursor.execute(alter_sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error executing '{alter_sql}': {e}")

    conn.close()
    print("Database schema sync completed.")


if __name__ == '__main__':
    sync()
