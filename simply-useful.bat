@echo off
setlocal enabledelayedexpansion

:: =================================================================
::  SIMPLY USEFUL - ELITE PLATFORM MANAGER v2.0 (PLATFORM EDITION)
:: =================================================================
:: v2.0 Updates:
:: - Added [8] OPEN APP  shortcut to launch both UI and API in browser
:: - AUDIT now runs 5 steps: Django check, migrations, TypeScript, Vite build,
::   + new dependency drift check (pip + npm outdated)
:: - HEALTH CHECK now verifies both Backend (port 4000) and Frontend (port 8080)
:: - START shows platform URLs clearly after warm-up
:: - Version banner updated to v2.0
:: =================================================================

set "BASE_DIR=%~dp0"

:MENU
cls
echo.
echo  ###############################################################
echo   SIMPLY USEFUL  -  ELITE PLATFORM MANAGER  v2.0
echo  ###############################################################
echo.
echo   PLATFORM
echo   [1]  START       Full-Stack (Backend + Frontend + Auto-Migrate)
echo   [2]  STOP        Clean shutdown of all processes
echo   [3]  HEALTH      Deep diagnostics + URL status
echo.
echo   DEVELOPER TOOLS
echo   [4]  TESTS       Full-Stack Test Suite (Django + Vitest)
echo   [5]  AUDIT       System audit (TypeScript, build, migrations, deps)
echo   [6]  SWAGGER     Open browsable REST API explorer
echo   [7]  OPEN APP    Launch frontend + API docs in browser
echo.
echo   [8]  EXIT
echo.
echo   Project: "%BASE_DIR%"
echo  ###############################################################
echo.
set /p choice="  Select an option [1-8]: "

if "%choice%"=="1"  goto START
if "%choice%"=="2"  goto STOP
if "%choice%"=="3"  goto HEALTH
if "%choice%"=="4"  goto TEST
if "%choice%"=="5"  goto AUDIT
if "%choice%"=="6"  goto SWAGGER
if "%choice%"=="7"  goto OPENAPP
if "%choice%"=="8" exit
goto MENU

:: =================================================================
:START
:: =================================================================
echo.
echo  [START] Checking environment prerequisites...
echo.

where node >nul 2>&1 || (
    echo  [ERROR] Node.js not found in PATH. Install from https://nodejs.org
    pause & goto MENU
)
where npm >nul 2>&1 || (
    echo  [ERROR] NPM not found in PATH.
    pause & goto MENU
)
where python >nul 2>&1 || (
    echo  [ERROR] Python not found in PATH. Install from https://python.org
    pause & goto MENU
)

echo  [OK] Node.js, NPM, and Python found.
echo.
echo  Cleaning previous node/python processes...
taskkill /F /IM node.exe   /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1

:: --- BACKEND ---
echo.
echo  [1/2] Starting Backend (Django on port 4000)...

if not exist "%BASE_DIR%backend" (
    echo  [ERROR] Backend directory not found at "%BASE_DIR%backend"
    pause & goto MENU
)

if not exist "%BASE_DIR%backend\venv" (
    echo  [!] Virtual environment not found. Creating...
    cd /d "%BASE_DIR%backend"
    python -m venv venv
    if !errorlevel! neq 0 (echo  [ERROR] Failed to create venv. & pause & goto MENU)

    echo  Installing Python dependencies...
    venv\Scripts\python -m pip install --upgrade pip -q
    venv\Scripts\pip install -r requirements.txt -q
    if !errorlevel! neq 0 (echo  [ERROR] pip install failed. & pause & goto MENU)

    echo  Applying initial migrations...
    venv\Scripts\python manage.py migrate --database=default
    venv\Scripts\python manage.py migrate --database=wh_navsari
    venv\Scripts\python manage.py migrate --database=wh_nashik
    echo  [OK] Virtual environment ready.
    cd /d "%BASE_DIR%"
)

start "Simply Useful - Backend" cmd /k "cd /d "%BASE_DIR%backend" && venv\Scripts\python manage.py migrate --database=default && venv\Scripts\python manage.py migrate --database=wh_navsari && venv\Scripts\python manage.py migrate --database=wh_nashik && echo. && echo  [BACKEND] http://localhost:4000 && echo  [API]     http://localhost:4000/api/v1/ && echo. && venv\Scripts\python manage.py runserver 0.0.0.0:4000"

:: --- FRONTEND ---
echo.
echo  [2/2] Starting Frontend (Vite on port 8080)...

if not exist "%BASE_DIR%frontend" (
    echo  [ERROR] Frontend directory not found at "%BASE_DIR%frontend"
    pause & goto MENU
)

if not exist "%BASE_DIR%frontend\node_modules" (
    echo  [!] Node modules missing. Installing...
    cd /d "%BASE_DIR%frontend" && npm install --silent
    cd /d "%BASE_DIR%"
)

start "Simply Useful - Frontend" cmd /k "cd /d "%BASE_DIR%frontend" && echo. && echo  [FRONTEND] http://localhost:8080 && echo. && npm run dev"

echo.
echo  Waiting for services to warm up (10s)...
timeout /t 10 >nul

goto HEALTH

:: =================================================================
:STOP
:: =================================================================
echo.
echo  [STOP] Shutting down all platform services...
taskkill /F /IM node.exe   /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
echo  [OK] All processes terminated.
echo.
pause
goto MENU

:: =================================================================
:HEALTH
:: =================================================================
echo.
echo  ###############################################################
echo   HEALTH CHECK
echo  ###############################################################
echo.

:: Backend health
curl -s --connect-timeout 5 http://localhost:4000/api/v1/health > "%BASE_DIR%_health_tmp.txt" 2>nul
findstr /i "ok" "%BASE_DIR%_health_tmp.txt" >nul
if %errorlevel% neq 0 (
    echo  [!!] Backend  : NOT RESPONDING  (http://localhost:4000)
    echo       Check the Backend terminal window for error logs.
) else (
    echo  [OK] Backend  : http://localhost:4000
    echo  [OK] REST API : http://localhost:4000/api/v1/
)
del "%BASE_DIR%_health_tmp.txt" >nul 2>&1

:: Frontend health
curl -s --connect-timeout 5 http://localhost:8080 > "%BASE_DIR%_fe_tmp.txt" 2>nul
if %errorlevel% neq 0 (
    echo  [!!] Frontend : NOT RESPONDING  (http://localhost:8080)
) else (
    echo  [OK] Frontend : http://localhost:8080
)
del "%BASE_DIR%_fe_tmp.txt" >nul 2>&1

echo.
echo  Active Modules:
echo    Sales Dashboard        /sales
echo    Admin Panel            /admin
echo    Inventory              /inventory
echo    CRM Leads              /sales/crm
echo    SO Territory Mapping   /admin/so-mapping
echo    Reports (SuperAdmin)   /reports
echo    HR Dashboard           /hr
echo.
pause
goto MENU

:: =================================================================
:TEST
:: =================================================================
cls
echo.
echo  ###############################################################
echo   TEST RUNNER SUITE
echo  ###############################################################
echo.
echo   [1]  Backend Tests  (Django manage.py test)
echo   [2]  Frontend Tests (Vitest)
echo   [3]  Full-Stack     (Both)
echo   [4]  TypeScript     (Type-check only, no build)
echo   [5]  Back to Menu
echo.
set /p test_choice="  Select an option [1-5]: "

if "%test_choice%"=="1" goto TEST_BACKEND
if "%test_choice%"=="2" goto TEST_FRONTEND
if "%test_choice%"=="3" goto TEST_ALL
if "%test_choice%"=="4" goto TEST_TS
if "%test_choice%"=="5" goto MENU
goto TEST

:TEST_BACKEND
echo.
echo  Running Django tests...
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend"
    venv\Scripts\python manage.py test --verbosity=2
) else ( echo  [ERROR] Backend directory not found. )
pause & goto MENU

:TEST_FRONTEND
echo.
echo  Running Vitest frontend tests...
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    if not exist "node_modules" ( call npm install --silent )
    call npm run test
) else ( echo  [ERROR] Frontend directory not found. )
pause & goto MENU

:TEST_ALL
echo.
echo  [1/2] Backend Tests...
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend"
    venv\Scripts\python manage.py test
)
echo.
echo  [2/2] Frontend Tests...
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    if not exist "node_modules" ( call npm install --silent )
    call npm run test
)
pause & goto MENU

:TEST_TS
echo.
echo  Running TypeScript type-check (tsc --noEmit)...
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    if not exist "node_modules" ( call npm install --silent )
    node node_modules/typescript/bin/tsc --noEmit
    if !errorlevel! neq 0 (
        echo  [!!] Type errors found. Fix before deploying.
    ) else (
        echo  [OK] Zero TypeScript errors.
    )
) else ( echo  [ERROR] Frontend directory not found. )
pause & goto MENU

:: =================================================================
:AUDIT
:: =================================================================
echo.
echo  ###############################################################
echo   ENTERPRISE SYSTEM AUDIT v2.0
echo  ###############################################################
echo.

echo  [1/5] Django System Check...
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend"
    venv\Scripts\python manage.py check
    if !errorlevel! neq 0 ( echo  [!!] Django check failed! ) else ( echo  [OK] Django check passed. )
)

echo.
echo  [2/5] Database Migration Status...
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend"
    venv\Scripts\python manage.py migrate --check --database=default >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [!] Pending migrations detected. Applying now...
        venv\Scripts\python manage.py migrate --database=default
        venv\Scripts\python manage.py migrate --database=wh_navsari
        venv\Scripts\python manage.py migrate --database=wh_nashik
    ) else (
        echo  [OK] Database schema is fully up to date.
    )
)

echo.
echo  [3/5] TypeScript Type Safety (tsc --noEmit)...
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    if not exist "node_modules" ( call npm install --silent )
    node node_modules/typescript/bin/tsc --noEmit
    if !errorlevel! neq 0 ( echo  [!!] TypeScript type errors found! ) else ( echo  [OK] Zero TypeScript errors. )
)

echo.
echo  [4/5] Frontend Production Build (Vite)...
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    call npm run build
    if !errorlevel! neq 0 ( echo  [!!] Vite build failed! ) else ( echo  [OK] Production bundle compiled successfully. )
)

echo.
echo  [5/5] Dependency Drift Check...
echo  Python packages:
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend"
    venv\Scripts\pip list --outdated 2>nul | findstr /v "Package Version" | findstr /v "\-\-\-"
    if !errorlevel! neq 0 ( echo  [OK] All Python packages up to date. )
)
echo  NPM packages:
if exist "%BASE_DIR%frontend" (
    cd /d "%BASE_DIR%frontend"
    npm outdated 2>nul
    if !errorlevel! neq 0 ( echo  [OK] All NPM packages up to date. )
)

echo.
echo  Audit complete.
cd /d "%BASE_DIR%"
pause
goto MENU

:: =================================================================
:SWAGGER
:: =================================================================
echo.
echo  Opening REST API Explorer (Browsable API)...
start http://localhost:4000/api/v1/
goto MENU

:: =================================================================
:OPENAPP
:: =================================================================
echo.
echo  Opening Simply Useful in browser...
timeout /t 1 >nul
start http://localhost:8080
timeout /t 1 >nul
start http://localhost:4000/api/v1/
echo  [OK] Launched:
echo       Frontend  http://localhost:8080
echo       API Docs  http://localhost:4000/api/v1/
echo.
pause
goto MENU

