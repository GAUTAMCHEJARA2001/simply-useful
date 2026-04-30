@echo off
cd frontend
echo [1/1] Starting Vite... > ..\frontend_start.log
npx vite --port 8080 --host 0.0.0.0 >> ..\frontend_start.log 2>&1
