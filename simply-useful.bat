@echo off
setlocal enabledelayedexpansion

:MENU
cls
echo =================================================================
echo  🌟 SIMPLY USEFUL - ELITE PLATFORM MANAGER v1.0 🌟
echo =================================================================
echo [1] 🚀 START PLATFORM (Full-Stack + Auto-Healing)
echo [2] 🛑 STOP PLATFORM  (Clean Termination)
echo [3] 🔍 HEALTH CHECK   (Deep Diagnostics)
echo [4] 🧪 RUN UNIT TESTS (Backend Logic)
echo [5] 📗 SWAGGER DOCS   (Open API)
echo [6] ❌ EXIT
echo =================================================================
set /p choice="👉 Select an option [1-6]: "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto HEALTH
if "%choice%"=="4" goto TEST
if "%choice%"=="5" goto SWAGGER
if "%choice%"=="6" exit
goto MENU

:START
echo.
echo 🔄 Cleaning previous ghost processes...
taskkill /F /IM node.exe >nul 2>&1

echo 📡 Synchronizing Backend...
if not exist backend\node_modules (
    echo ⚠️  Dependencies missing. Installing...
    cd backend && npm install && cd ..
)
cd backend
start "Backend-Service" cmd /k "npm run dev"
cd ..

echo 🌐 Synchronizing Frontend...
if not exist frontend\node_modules (
    echo ⚠️  Dependencies missing. Installing...
    cd frontend && npm install && cd ..
)
cd frontend
start "Frontend-Service" cmd /k "npm run dev"
cd ..

echo ⏳ Warming up telemetry (8s)...
timeout /t 8 >nul
goto HEALTH

:STOP
echo.
echo 🛑 Shutting down all Node services...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Platform offline.
pause
goto MENU

:HEALTH
echo.
echo 🔍 Verifying API Health...
curl -s http://localhost:3000/api/v1/health | findstr /i "ok" >nul
if %errorlevel% neq 0 (
    echo ❌ DIAGNOSTIC FAILURE: Backend not responding!
) else (
    echo ✅ DIAGNOSTIC SUCCESS: Backend Layer is healthy.
)
echo 🚀 Client reachable: http://localhost:5173
pause
goto MENU

:TEST
echo.
echo 🧪 Running logic verification...
cd backend && npm test && cd ..
pause
goto MENU

:SWAGGER
echo.
echo 📗 Opening OpenAPI documentation...
start http://localhost:3000/api-docs
goto MENU
