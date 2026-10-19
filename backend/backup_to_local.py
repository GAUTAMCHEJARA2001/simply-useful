import os
import sys
import subprocess
import datetime
import shutil

# Database Configuration (matches settings.py defaults)
DB_NAME = os.environ.get('DATABASE_NAME', 'db_master')
DB_USER = os.environ.get('DATABASE_USER', 'postgres')
DB_PASSWORD = os.environ.get('DATABASE_PASSWORD', 'admin')
DB_HOST = os.environ.get('DATABASE_HOST', 'localhost')
DB_PORT = os.environ.get('DATABASE_PORT', '5432')

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    try:
        from urllib.parse import urlparse
        url = urlparse(DATABASE_URL)
        DB_NAME = url.path[1:]
        DB_USER = url.username
        DB_PASSWORD = url.password
        DB_HOST = url.hostname
        DB_PORT = str(url.port or 5432)
    except Exception:
        pass

def find_pg_dump():
    # 1. Try system PATH
    path_in_env = shutil.which("pg_dump")
    if path_in_env:
        return path_in_env
        
    # 2. Try standard Windows paths
    if os.name == 'nt':
        standard_dirs = [
            r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\12\bin\pg_dump.exe",
        ]
        for path in standard_dirs:
            if os.path.exists(path):
                return path
    else:
        # Standard Linux / Unix paths
        linux_paths = [
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "/usr/lib/postgresql/17/bin/pg_dump",
            "/usr/lib/postgresql/16/bin/pg_dump",
            "/usr/lib/postgresql/15/bin/pg_dump",
            "/usr/lib/postgresql/14/bin/pg_dump",
            "/usr/lib/postgresql/13/bin/pg_dump",
            "/usr/lib/postgresql/12/bin/pg_dump",
        ]
        for path in linux_paths:
            if os.path.exists(path):
                return path
                
    return "pg_dump" # fallback

def find_pg_restore():
    # 1. Try system PATH
    path_in_env = shutil.which("pg_restore")
    if path_in_env:
        return path_in_env
        
    # 2. Try standard Windows paths
    if os.name == 'nt':
        standard_dirs = [
            r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\16\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\15\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\14\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\13\bin\pg_restore.exe",
            r"C:\Program Files\PostgreSQL\12\bin\pg_restore.exe",
        ]
        for path in standard_dirs:
            if os.path.exists(path):
                return path
    else:
        linux_paths = [
            "/usr/bin/pg_restore",
            "/usr/local/bin/pg_restore",
            "/usr/lib/postgresql/17/bin/pg_restore",
            "/usr/lib/postgresql/16/bin/pg_restore",
            "/usr/lib/postgresql/15/bin/pg_restore",
            "/usr/lib/postgresql/14/bin/pg_restore",
            "/usr/lib/postgresql/13/bin/pg_restore",
            "/usr/lib/postgresql/12/bin/pg_restore",
        ]
        for path in linux_paths:
            if os.path.exists(path):
                return path
                
    return "pg_restore" # fallback

def restore_pg_dump(backup_file_path, db_name=DB_NAME, db_user=DB_USER, db_password=DB_PASSWORD, db_host=DB_HOST, db_port=DB_PORT):
    # If the backup is in JSON format, restore via Python/psycopg2 table insertion
    if backup_file_path.endswith('.json'):
        print(f"Detected JSON backup file: {backup_file_path}. Restoring table data...")
        try:
            import json, psycopg2
            with open(backup_file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)

            # Check if this is a Django fixture list
            if isinstance(content, list) and content and 'model' in content[0] and 'fields' in content[0]:
                try:
                    import django
                    from django.core.management import call_command
                    from django.db import connection
                    call_command('loaddata', backup_file_path)
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                SELECT 
                                    s.relname AS seq_name,
                                    t.relname AS table_name,
                                    a.attname AS col_name
                                FROM pg_class s
                                JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
                                JOIN pg_class t ON t.oid = d.refobjid
                                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                                WHERE s.relkind = 'S';
                            """)
                            for seq, table, col in cursor.fetchall():
                                try:
                                    cursor.execute(f'SELECT setval(\'"{seq}"\', COALESCE((SELECT MAX("{col}") FROM "{table}"), 1));')
                                except Exception:
                                    pass
                    except Exception as seq_err:
                        print(f"Sequence update note: {seq_err}")
                    print("Django JSON fixture data loaded successfully and sequences synchronized.")
                    return True, "Database restored successfully from JSON fixture."
                except Exception as dj_err:
                    print(f"loaddata failed: {dj_err}")
                    return False, f"JSON loaddata failed: {str(dj_err)}"

            conn = psycopg2.connect(
                dbname=db_name,
                user=db_user,
                password=db_password,
                host=db_host,
                port=db_port
            )
            conn.autocommit = False
            cur = conn.cursor()
            cur.execute("SET session_replication_role = 'replica';")

            tables_dict = content.get('tables', {}) if isinstance(content, dict) and 'tables' in content else None
            if not tables_dict and isinstance(content, dict) and 'table' in content:
                tables_dict = {content['table']: {'columns': content.get('columns', []), 'rows': content.get('rows', [])}}

            if not tables_dict:
                conn.close()
                return False, "Unrecognized JSON backup structure."

            restored_count = 0
            for t_name, t_data in tables_dict.items():
                cols = t_data.get('columns', [])
                rows = t_data.get('rows', [])
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = %s
                    );
                """, (t_name,))
                if not cur.fetchone()[0]:
                    continue

                cur.execute(f'TRUNCATE TABLE "{t_name}" CASCADE;')
                if rows and cols:
                    cols_sql = ", ".join(f'"{c}"' for c in cols)
                    placeholders = ", ".join(["%s"] * len(cols))
                    cur.executemany(f'INSERT INTO "{t_name}" ({cols_sql}) VALUES ({placeholders})', rows)
                restored_count += 1

            cur.execute("SET session_replication_role = 'origin';")
            conn.commit()
            conn.close()
            print(f"Database restored successfully from JSON ({restored_count} tables).")
            return True, "Success"
        except Exception as e:
            print(f"[ERROR] JSON restore failed: {e}")
            return False, str(e)

    pg_restore_path = find_pg_restore()
    print(f"Using pg_restore path: {pg_restore_path}")
    print(f"Restoring database '{db_name}' from {backup_file_path}...")
    
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    cmd = [
        pg_restore_path,
        '-h', db_host,
        '-p', db_port,
        '-U', db_user,
        '-d', db_name,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '-v',
        backup_file_path
    ]
    
    try:
        res = subprocess.run(cmd, env=env, capture_output=True, text=True)
        stderr_output = res.stderr or ""
        if res.returncode == 0 or (res.returncode == 1 and "ERROR:" not in stderr_output):
            print("Database restored successfully from dump file.")
            print("Running automated post-restore Enterprise Upgrade & Evolution Engine...")
            try:
                from scripts.upgrade_old_backup_to_new_db import run_full_upgrade
                up_res = run_full_upgrade(silent=False)
                msg = f"Database restored and auto-upgraded to Enterprise Structure! ({up_res['message']})"
                print(f"[OK] {msg}")
                return True, msg
            except Exception as up_err:
                print(f"[WARNING] Post-restore upgrade warning: {up_err}")
                return True, f"Database restored successfully. Post-restore upgrade warning: {up_err}"
        else:
            error_msg = res.stderr or res.stdout or "Unknown pg_restore error"
            print(f"[ERROR] pg_restore failed: {error_msg}")
            return False, error_msg
    except Exception as e:
        print(f"[ERROR] pg_restore failed: {e}")
        return False, str(e)

def take_pg_dump(dest_dir):
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"db_backup_{timestamp}.dump"
    local_temp_path = backup_filename
    
    print(f"Creating local backup dump: {backup_filename}...")
    
    # Set the pg_dump password environment variable to prevent password prompting
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD
    
    # Construct pg_dump command
    pg_dump_path = find_pg_dump()
    print(f"Using pg_dump path: {pg_dump_path}")
    
    cmd = [
        pg_dump_path,
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-U', DB_USER,
        '-n', 'public', # Dump only the active clean public schema
        '-F', 'c', # Custom compressed format
        '-b',      # Include large objects
        '-O',      # Do not output commands to set ownership
        '-x',      # Do not dump access privileges
        '-v',      # Verbose output
        '-f', local_temp_path,
        DB_NAME
    ]
    
    try:
        subprocess.run(cmd, env=env, check=True)
        print("Backup file created successfully.")
        
        # Verify backup exists and has valid non-zero size
        if not os.path.exists(local_temp_path) or os.path.getsize(local_temp_path) == 0:
            raise ValueError(f"Backup file {local_temp_path} is missing or 0 bytes.")
            
        file_size_bytes = os.path.getsize(local_temp_path)
        
        # Compute SHA-256 Checksum for security and restore verification
        import hashlib
        hasher = hashlib.sha256()
        with open(local_temp_path, 'rb') as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        checksum = hasher.hexdigest()
        
        # Copy to destination directory
        dest_path = os.path.join(dest_dir, backup_filename)
        shutil.copy2(local_temp_path, dest_path)
        
        # Write checksum manifest alongside dump
        checksum_path = dest_path + '.sha256'
        with open(checksum_path, 'w') as f:
            f.write(f"{checksum}  {backup_filename}\n")
            
        print(f"Backup saved to local folder: {dest_path} (Size: {file_size_bytes} bytes, SHA256: {checksum[:8]}...)")
        return backup_filename
    except Exception as e:
        print(f"\n[WARNING] pg_dump failed ({e}). Attempting full JSON database dump fallback covering all tables...")
        try:
            import psycopg2, json
            from decimal import Decimal
            import datetime as dt

            class SafeEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, (dt.date, dt.datetime)):
                        return obj.isoformat()
                    if isinstance(obj, Decimal):
                        return float(obj)
                    return str(obj)

            json_backup_filename = f"db_backup_{timestamp}.json"
            json_dest_path = os.path.join(dest_dir, json_backup_filename)

            conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
            cur = conn.cursor()
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;")
            tables = [r[0] for r in cur.fetchall()]

            all_tables_data = {}
            for t in tables:
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position;", (t,))
                cols = [r[0] for r in cur.fetchall()]
                cur.execute(f'SELECT * FROM "{t}";')
                all_tables_data[t] = {'columns': cols, 'rows': cur.fetchall()}
            conn.close()

            with open(json_dest_path, 'w', encoding='utf-8') as f:
                json.dump({'created_at': dt.datetime.now().isoformat(), 'tables': all_tables_data}, f, indent=2, cls=SafeEncoder)
            print(f"Fallback JSON backup successfully saved: {json_dest_path}")
            return json_backup_filename
        except Exception as json_err:
            print(f"\n[ERROR] Both pg_dump and JSON fallback failed: {json_err}")
            sys.exit(1)
    finally:
        # Clean up temporary local file if it exists in script folder
        if os.path.exists(local_temp_path):
            try:
                os.remove(local_temp_path)
            except Exception:
                pass

def prune_old_backups(dest_dir):
    print("Checking for old backup files in local folder (keeping only 30 days)...")
    cutoff_date = datetime.datetime.now() - datetime.timedelta(days=30)
    
    try:
        for filename in os.listdir(dest_dir):
            if filename.startswith("db_backup_") and filename.endswith(".dump"):
                file_path = os.path.join(dest_dir, filename)
                file_time = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff_date:
                    print(f"Deleting old backup: {filename} (Modified: {file_time})")
                    os.remove(file_path)
        print("Local folder backup pruning completed.")
    except Exception as e:
        print(f"Warning: Failed to prune old backups: {e}")

def load_local_dir_from_settings():
    import json
    settings_path = os.path.join(os.path.dirname(__file__), 'settings_store.json')
    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('local_backup_dir')
        except Exception as e:
            print(f"Warning: Failed to load settings_store.json: {e}")
    return None

def main():
    if '--restore' in sys.argv:
        try:
            restore_idx = sys.argv.index('--restore')
            if restore_idx + 1 < len(sys.argv):
                restore_file = sys.argv[restore_idx + 1]
                if not os.path.exists(restore_file):
                    print(f"Error: File '{restore_file}' does not exist.")
                    sys.exit(1)
                success, msg = restore_pg_dump(restore_file)
                if success:
                    print("Done!")
                    sys.exit(0)
                else:
                    print(f"Restore failed: {msg}")
                    sys.exit(1)
            else:
                print("Usage: python backup_to_local.py --restore <BACKUP_FILE_PATH>")
                sys.exit(1)
        except Exception as e:
            print(f"Error parsing restore argument: {e}")
            sys.exit(1)

    dest_dir = None
    if len(sys.argv) >= 2:
        dest_dir = sys.argv[1]
    else:
        dest_dir = load_local_dir_from_settings()
        
    if not dest_dir:
        print("Usage: python backup_to_local.py <LOCAL_BACKUP_DIRECTORY_PATH>")
        print("Or configure 'local_backup_dir' in settings_store.json first.")
        sys.exit(1)
        
    # Ensure destination directory exists
    if not os.path.exists(dest_dir):
        try:
            os.makedirs(dest_dir, exist_ok=True)
            print(f"Created local backup folder: {dest_dir}")
        except Exception as e:
            print(f"[ERROR] Failed to create folder '{dest_dir}': {e}")
            sys.exit(1)
            
    # 1. Take database dump and save it in the target directory
    take_pg_dump(dest_dir)
    
    # 2. Prune old backups inside the target directory
    prune_old_backups(dest_dir)
    
    print("Done!")

if __name__ == '__main__':
    main()
