import os
import sys
import shutil
import subprocess
import datetime
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.views import send_success, send_error, load_settings, save_settings
from backup_to_local import find_pg_dump, load_local_dir_from_settings, restore_pg_dump

@api_view(['GET'])
def local_backup_status_view(request):
    pg_dump_path = find_pg_dump()
    pg_dump_found = False
    if os.path.isabs(pg_dump_path):
        pg_dump_found = os.path.exists(pg_dump_path)
    else:
        pg_dump_found = shutil.which(pg_dump_path) is not None
    settings_data = load_settings()
    local_backup_dir = settings_data.get('local_backup_dir') or load_local_dir_from_settings() or 'C:\\SimplyUsefulBackups'
    return send_success({
        'pg_dump_found': pg_dump_found,
        'pg_dump_path': pg_dump_path,
        'local_backup_dir': local_backup_dir,
        'local_backup_enabled': settings_data.get('local_backup_enabled', False),
        'local_backup_time': settings_data.get('local_backup_time', '02:00')
    }, 'Local backup status retrieved')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def download_postgres_dump_view(request):
    db_config = settings.DATABASES.get('default', {})
    db_name = db_config.get('NAME', 'db_master')
    db_user = db_config.get('USER', 'postgres')
    db_password = db_config.get('PASSWORD', 'admin')
    db_host = db_config.get('HOST', 'localhost')
    db_port = str(db_config.get('PORT', '5432'))
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'db_backup_{timestamp}.dump'
    local_temp_path = os.path.join(settings.BASE_DIR, backup_filename)
    pg_dump_path = find_pg_dump()
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    cmd = [pg_dump_path, '-h', db_host, '-p', db_port, '-U', db_user, '-F', 'c', '-b', '-O', '-x', '-f', local_temp_path, db_name]
    try:
        subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        if not os.path.exists(local_temp_path):
            return send_error('Failed to generate database dump file.', 500)
        with open(local_temp_path, 'rb') as fh:
            data = fh.read()
        try:
            os.remove(local_temp_path)
        except Exception:
            pass
        response = HttpResponse(data, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{backup_filename}"'
        return response
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or e.stdout or str(e)
        if os.path.exists(local_temp_path):
            try:
                os.remove(local_temp_path)
            except Exception:
                pass
        return send_error(f'pg_dump failed: {error_msg}', 500)
    except Exception as e:
        if os.path.exists(local_temp_path):
            try:
                os.remove(local_temp_path)
            except Exception:
                pass
        return send_error(f'Unexpected error: {str(e)}', 500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_local_backup_view(request):
    enabled = request.data.get('enabled', False)
    backup_time = request.data.get('time', '02:00').strip()
    local_backup_dir = request.data.get('local_backup_dir', 'C:\\SimplyUsefulBackups').strip()
    current_data = load_settings()
    current_data['local_backup_enabled'] = enabled
    current_data['localBackupEnabled'] = enabled
    current_data['local_backup_time'] = backup_time
    current_data['localBackupTime'] = backup_time
    current_data['local_backup_dir'] = local_backup_dir
    current_data['localBackupDir'] = local_backup_dir
    save_settings(current_data)
    task_name = 'SimplyUsefulAutoBackup'
    try:
        subprocess.run(['schtasks', '/delete', '/tn', task_name, '/f'], capture_output=True, text=True)
    except Exception:
        pass
    if not enabled:
        return send_success(None, 'Automatic backup schedule disabled.')
    venv_python = os.path.join(settings.BASE_DIR, 'venv', 'Scripts', 'python.exe')
    if not os.path.exists(venv_python):
        venv_python = sys.executable
    script_path = os.path.join(settings.BASE_DIR, 'backup_to_local.py')
    if not os.path.exists(script_path):
        return send_error("Backup helper script 'backup_to_local.py' not found in backend directory.", 500)
    task_cmd = f'cmd.exe /c "cd /d "{settings.BASE_DIR}" && "{venv_python}" "{script_path}""'
    try:
        cmd = ['schtasks', '/create', '/tn', task_name, '/tr', task_cmd, '/sc', 'daily', '/st', backup_time, '/f']
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            error_details = res.stderr or res.stdout
            return send_error(f'Failed to create automatic schedule task: {error_details}', 500)
        return send_success({'task_name': task_name, 'time': backup_time, 'local_backup_dir': local_backup_dir}, f'Automatic backup scheduled daily at {backup_time} to {local_backup_dir}.')
    except Exception as e:
        return send_error(f'An unexpected error occurred: {str(e)}', 500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_local_backups_view(request):
    settings_data = load_settings()
    local_backup_dir = settings_data.get('local_backup_dir') or load_local_dir_from_settings() or 'C:\\SimplyUsefulBackups'
    backups = []
    if os.path.exists(local_backup_dir) and os.path.isdir(local_backup_dir):
        try:
            for filename in os.listdir(local_backup_dir):
                if filename.startswith('db_backup_') and filename.endswith('.dump'):
                    file_path = os.path.join(local_backup_dir, filename)
                    if os.path.isfile(file_path):
                        stat = os.stat(file_path)
                        size_bytes = stat.st_size
                        if size_bytes >= 1024 * 1024:
                            size_str = f'{size_bytes / (1024 * 1024):.1f} MB'
                        else:
                            size_str = f'{size_bytes / 1024:.1f} KB'
                        mod_time = datetime.datetime.fromtimestamp(stat.st_mtime)
                        created_at_str = mod_time.strftime('%Y-%m-%d %H:%M:%S')
                        backups.append({'filename': filename, 'size': size_str, 'created_at': created_at_str, 'timestamp': stat.st_mtime})
            backups.sort(key=lambda x: x['timestamp'], reverse=True)
            for b in backups:
                b.pop('timestamp', None)
        except Exception as e:
            return send_error(f'Failed to scan local backup folder: {str(e)}', 500)
    return send_success(backups, 'Local backups listed successfully')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_postgres_dump_view(request):
    settings_data = load_settings()
    local_backup_dir = settings_data.get('local_backup_dir') or load_local_dir_from_settings() or 'C:\\SimplyUsefulBackups'
    filename = request.data.get('filename')
    uploaded_file = request.FILES.get('file')
    if not filename and not uploaded_file:
        return send_error("Please specify a local 'filename' or upload a backup 'file'.", 400)
    backup_file_path = None
    is_temp_file = False
    try:
        if uploaded_file:
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            temp_filename = f'db_restore_temp_{timestamp}.dump'
            backup_file_path = os.path.join(settings.BASE_DIR, temp_filename)
            is_temp_file = True
            with open(backup_file_path, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
        else:
            filename = os.path.basename(filename)
            backup_file_path = os.path.join(local_backup_dir, filename)
            if not os.path.exists(backup_file_path):
                return send_error(f"Local backup file '{filename}' not found.", 404)
        safety_filename = None
        try:
            os.makedirs(local_backup_dir, exist_ok=True)
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            safety_filename = f'db_backup_pre_restore_{timestamp}.dump'
            db_config = settings.DATABASES.get('default', {})
            db_name = db_config.get('NAME', 'db_master')
            db_user = db_config.get('USER', 'postgres')
            db_password = db_config.get('PASSWORD', 'admin')
            db_host = db_config.get('HOST', 'localhost')
            db_port = str(db_config.get('PORT', '5432'))
            safety_temp_path = os.path.join(settings.BASE_DIR, safety_filename)
            pg_dump_path = find_pg_dump()
            env = os.environ.copy()
            env['PGPASSWORD'] = db_password
            cmd = [pg_dump_path, '-h', db_host, '-p', db_port, '-U', db_user, '-F', 'c', '-b', '-O', '-x', '-f', safety_temp_path, db_name]
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
            safety_dest_path = os.path.join(local_backup_dir, safety_filename)
            shutil.copy2(safety_temp_path, safety_dest_path)
            try:
                os.remove(safety_temp_path)
            except Exception:
                pass
        except Exception as e:
            print(f'[WARNING] Safety backup failed: {e}. Proceeding with restore anyway.')
        db_config = settings.DATABASES.get('default', {})
        db_name = db_config.get('NAME', 'db_master')
        db_user = db_config.get('USER', 'postgres')
        db_password = db_config.get('PASSWORD', 'admin')
        db_host = db_config.get('HOST', 'localhost')
        db_port = str(db_config.get('PORT', '5432'))
        success, message = restore_pg_dump(backup_file_path=backup_file_path, db_name=db_name, db_user=db_user, db_password=db_password, db_host=db_host, db_port=db_port)
        if success:
            msg = 'Database restore completed successfully.'
            if safety_filename:
                msg += f' Safety backup created: {safety_filename}.'
            return send_success(None, msg)
        else:
            return send_error(f'Database restore failed: {message}', 500)
    finally:
        if is_temp_file and backup_file_path and os.path.exists(backup_file_path):
            try:
                os.remove(backup_file_path)
            except Exception:
                pass
