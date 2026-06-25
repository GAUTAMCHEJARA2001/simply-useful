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
                
    return "pg_restore" # fallback

def restore_pg_dump(backup_file_path, db_name=DB_NAME, db_user=DB_USER, db_password=DB_PASSWORD, db_host=DB_HOST, db_port=DB_PORT):
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
        '-v',
        backup_file_path
    ]
    
    try:
        res = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if res.returncode == 0:
            print("Database restored successfully.")
            return True, "Success"
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
        '-F', 'c', # Custom compressed format
        '-b',      # Include large objects
        '-v',      # Verbose output
        '-f', local_temp_path,
        DB_NAME
    ]
    
    try:
        subprocess.run(cmd, env=env, check=True)
        print("Backup file created successfully.")
        
        # Copy to destination directory
        dest_path = os.path.join(dest_dir, backup_filename)
        shutil.copy2(local_temp_path, dest_path)
        print(f"Backup saved to local folder: {dest_path}")
        return backup_filename
    except Exception as e:
        print(f"\n[ERROR] pg_dump or copy failed: {e}")
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
