@echo off
setlocal

echo ===========================================
echo 🚀 STARTING SIMPLY USEFUL PLATFORM (ELITE)
echo ===========================================

:: 1. Cleanup old processes
echo 🔄 Cleaning previous ghost processes...
taskkill /F /IM node.exe >nul 2>&1

:: 2. Auto-Healing: Backend Dependencies
if not exist backend\node_modules (
    echo ⚠️  Backend node_modules missing. Synchronizing...
    cd backend && npm install && cd ..
)

:: 3. Auto-Healing: Frontend Dependencies
if not exist frontend\node_modules (
    echo ⚠️  Frontend node_modules missing. Synchronizing...
    cd frontend && npm install && cd ..
)

:: 4. Start Services
echo 📡 Launching Backend...
cd backend
start "Simply-Backend" cmd /k "npm run dev"
cd ..

:: Wait for DB and server to warm up
echo ⏳ Waiting for backend telemetry...
timeout /t 8 >nul

echo 🌐 Launching Frontend...
cd frontend
start "Simply-Frontend" cmd /k "npm run dev"
cd ..

echo ===========================================
echo ✅ ALL SERVICES DISPATCHED
echo ===========================================

:: 5. Health Assurance
echo 🔍 Verifying API Health...
curl -s http://localhost:3000/api/v1/health | findstr /i "ok" >nul

if %errorlevel% neq 0 (
    echo ❌ DIAGNOSTIC FAILURE: Backend health check failed!
    echo 👉 Inspect the "Simply-Backend" window for log traces.
) else (
    echo ✅ DIAGNOSTIC SUCCESS: Backend is healthy and responsive!
)

echo.
echo 📘 Documentation: http://localhost:3000/api-docs
echo 🚀 Application : http://localhost:5173
echo.
pause
