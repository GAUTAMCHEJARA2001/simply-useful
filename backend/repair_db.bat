@echo off
echo ==========================================
echo       DATABASE REPAIR TOOL
echo ==========================================
echo.

set "BASE_DIR=%~dp0"

if not exist "%BASE_DIR%venv" (
    echo [ERROR] Virtual environment not found at %BASE_DIR%venv
    pause
    exit /b 1
)

echo [1/4] Running Django system check...
cd /d "%BASE_DIR%"
venv\Scripts\python manage.py check
if %errorlevel% neq 0 (
    echo [!!] Django check failed! Fix errors before repairing.
    pause & exit /b 1
)
echo [OK] Django check passed.
echo.

echo [2/4] Applying pending migrations...
venv\Scripts\python manage.py migrate
if %errorlevel% neq 0 (
    echo [!!] Migration failed!
    pause & exit /b 1
)
echo [OK] Migrations applied.
echo.

echo [3/4] Regenerating migrations (if model changes detected)...
venv\Scripts\python manage.py makemigrations --check >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Pending model changes detected. Generating migrations...
    venv\Scripts\python manage.py makemigrations
)
echo [OK] Migrations up to date.
echo.

echo [4/4] Adding performance indexes...
venv\Scripts\python manage.py add_indexes_to_warehouses
echo.

echo ==========================================
echo  Database repair complete!
echo ==========================================
pause
