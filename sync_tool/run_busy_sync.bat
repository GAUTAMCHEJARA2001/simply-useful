@echo off
echo ==============================================
echo      BUSY ACCOUNTING TO CLOUD SYNC TOOL
echo ==============================================
echo.

:loop
echo [%time%] Starting sync...
powershell -ExecutionPolicy Bypass -File "%~dp0busy_sync.ps1"

echo.
echo Sync completed. Waiting 10 minutes before next sync...
echo (Press Ctrl+C to stop)
timeout /t 600 >nobreak

goto loop
