@echo off
:: XAMPP Conflict Fixer Script
:: Run this file as Administrator (Right-click -> Run as administrator)

echo ========================================================
echo   EcoCollect - XAMPP Port 3306 Conflict Fixer (Admin)
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator!
    echo Please right-click this file and choose "Run as administrator".
    echo.
    pause
    exit /b
)

echo [1/3] Disabling automatic logon scheduled tasks...
schtasks /change /tn "XAMPP_MySQL" /disable >nul 2>&1
if %errorLevel% eq 0 (
    echo  - Successfully disabled automatic MySQL logon task.
) else (
    echo  - Logon task was already disabled or not found.
)

schtasks /change /tn "XAMPP_Apache" /disable >nul 2>&1
if %errorLevel% eq 0 (
    echo  - Successfully disabled automatic Apache logon task.
) else (
    echo  - Logon task was already disabled or not found.
)

echo.
echo [2/3] Force terminating background MySQL (mysqld.exe) process...
taskkill /F /IM mysqld.exe >nul 2>&1
if %errorLevel% eq 0 (
    echo  - Successfully killed conflicting background MySQL process.
) else (
    echo  - No conflicting background MySQL process found.
)

echo.
echo [3/3] Force terminating background Apache (httpd.exe) process...
taskkill /F /IM httpd.exe >nul 2>&1
if %errorLevel% eq 0 (
    echo  - Successfully killed conflicting background Apache process.
) else (
    echo  - No conflicting background Apache process found.
)

echo.
echo ========================================================
echo SUCCESS: Conflicts resolved!
echo You can now start Apache and MySQL in XAMPP Control Panel.
echo ========================================================
echo.
pause
