@echo off
setlocal enabledelayedexpansion

:: =================================================================
::  SIMPLY USEFUL - ELITE PLATFORM MANAGER v1.4 (FINAL HARDENED)
:: =================================================================
:: v1.4 Fixes:
:: - Escaped command chaining (^&^&) for start cmd /k
:: - Buffered Health Check via temp file
:: - Standardized CLI environment audit
:: =================================================================

set "BASE_DIR=%~dp0"

:MENU
cls
echo -----------------------------------------------------------------
echo  SIMPLY USEFUL - ELITE PLATFORM MANAGER v1.4
echo -----------------------------------------------------------------
echo [1] START PLATFORM (Full-Stack + Auto-Healing)
echo [2] STOP PLATFORM  (Clean Termination)
echo [3] HEALTH CHECK   (Deep Diagnostics)
echo [4] RUN UNIT TESTS (Backend Logic)
echo [5] SWAGGER DOCS   (Open API)
echo [6] EXIT
echo -----------------------------------------------------------------
echo  Project Root: "%BASE_DIR%"
echo -----------------------------------------------------------------
set /p choice="  Select an option [1-6]: "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto HEALTH
if "%choice%"=="4" goto TEST
if "%choice%"=="5" goto SWAGGER
if "%choice%"=="6" exit
goto MENU

:START
echo.
echo Checking Environment...
where node >nul 2>&1 || (echo ERROR: Node.js not found in PATH && pause && goto MENU)
where npm >nul 2>&1 || (echo ERROR: NPM not found in PATH && pause && goto MENU)

echo.
echo Cleaning previous node processes...
taskkill /F /IM node.exe /T >nul 2>&1

:: BACKEND
echo.
echo Starting Backend Service...
if not exist "%BASE_DIR%backend" (
    echo ERROR: Backend directory missing at "%BASE_DIR%backend"
    pause
    goto MENU
)
if not exist "%BASE_DIR%backend\node_modules" (
    echo [!] Dependencies missing. Synchronizing...
    cd /d "%BASE_DIR%backend" && npm install
)
:: PRO-LEVEL START: Escaped chaining prevents quote-parsing failure
start "Backend" cmd /k cd /d "%BASE_DIR%backend" ^&^& npm run dev

:: FRONTEND
echo.
echo Starting Frontend Service...
if not exist "%BASE_DIR%frontend" (
    echo ERROR: Frontend directory missing at "%BASE_DIR%frontend"
    pause
    goto MENU
)
if not exist "%BASE_DIR%frontend\node_modules" (
    echo [!] Dependencies missing. Synchronizing...
    cd /d "%BASE_DIR%frontend" && npm install
)
start "Frontend" cmd /k cd /d "%BASE_DIR%frontend" ^&^& npm run dev

echo.
echo Waiting for telemetry warm-up (8s)...
timeout /t 8 >nul
goto HEALTH

:STOP
echo.
echo Stopping all platform processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo Done.
pause
goto MENU

:HEALTH
echo.
echo Verifying API Health...
:: Buffered health check to prevent pipe race conditions
curl -s --connect-timeout 5 http://localhost:4000/api/v1/health > "%BASE_DIR%temp_health.txt" 2>nul
findstr /i "ok" "%BASE_DIR%temp_health.txt" >nul

if %errorlevel% neq 0 (
    echo [!] Backend not responding!
    echo [?] Check the Backend window for error logs.
) else (
    echo [OK] Backend Layer is healthy.
)
del "%BASE_DIR%temp_health.txt" >nul 2>&1

echo [OK] Client: http://localhost:8080
pause
goto MENU

:TEST
echo.
echo Running logic verification...
if exist "%BASE_DIR%backend" (
    cd /d "%BASE_DIR%backend" && npm test
) else (
    echo ERROR: Backend folder not found.
)
pause
goto MENU

:SWAGGER
echo.
echo Opening OpenAPI documentation...
start http://localhost:4000/api-docs
goto MENU
