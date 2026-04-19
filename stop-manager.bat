@echo off
echo ===========================================
echo 🛑 STOPPING ALL SIMPLY USEFUL SERVICES
echo ===========================================

echo 🔄 Force-terminating node processes...
taskkill /F /IM node.exe >nul 2>&1

echo ✅ Cleanup complete. All services stopped.
echo ===========================================
pause
