@echo off
echo ==========================================
echo       AUTO DEPLOY AND GIT PUSH TOOL
echo ==========================================
echo.

echo [1/3] Adding all changes to Git...
git add .
echo.

set /p msg="Enter commit message (or press Enter for default): "
if "%msg%"=="" set msg="Auto deploy commit"

echo [2/3] Committing changes...
git commit -m "%msg%"
echo.

echo [3/3] Pushing to origin main (Triggering Deployment)...
git push origin main
echo.

echo ==========================================
echo Deployment push complete! 
echo If your server is connected to GitHub (like Vercel, Render, AWS), 
echo it will now automatically build and deploy the latest code.
echo ==========================================
pause
