@echo off
setlocal EnableDelayedExpansion

echo ==============================================
echo      BUSY ACCOUNTING TO CLOUD SYNC TOOL
echo ==============================================
echo.

set CONFIG_FILE=%~dp0busy_config.ini

if not exist "%CONFIG_FILE%" (
    echo It looks like this is your first time running the sync tool.
    echo Please provide your details below.
    echo.
    set /p DB_PATH="Enter full path to your .bds database (e.g. C:\BusyWin\DATA\COMP0010\db12026.bds): "
    set TENANT_ID=default
    
    echo DB_PATH=!DB_PATH!> "%CONFIG_FILE%"
    echo TENANT_ID=!TENANT_ID!>> "%CONFIG_FILE%"
    echo.
    echo Configuration saved to busy_config.ini!
    echo ==============================================
)

:: Read from config file
FOR /F "tokens=1* delims==" %%A IN ('type "%CONFIG_FILE%"') DO (
    if "%%A"=="DB_PATH" set DB_PATH=%%B
    if "%%A"=="TENANT_ID" set TENANT_ID=%%B
)

:loop
echo.
echo [%time%] Starting sync...
:: We use the 32-bit version of PowerShell (SysWOW64) because the built-in 
:: Windows database driver (Microsoft.Jet.OLEDB.4.0) only works in 32-bit mode!
:: This ensures the script works on ANY computer without installing extra drivers.

%SystemRoot%\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File "%~dp0busy_sync.ps1" "%DB_PATH%" "%TENANT_ID%"

echo.
echo Sync completed. Waiting 10 minutes before next sync...
echo (Press Ctrl+C to stop)
timeout /t 600 >nobreak

goto loop
