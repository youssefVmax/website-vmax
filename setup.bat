@echo off
echo ===============================================
echo VMAX Sales System - Database Setup
echo ===============================================
echo.

echo Checking if PHP is available...
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP is not installed or not in PATH
    echo Please install PHP or add it to your system PATH
    pause
    exit /b 1
)

echo PHP is available. Starting database setup...
echo.

echo Running connection test...
php api/test-connection.php
echo.

echo Running database setup...
php setup-database.php
echo.

echo ===============================================
echo Setup completed! 
echo.
echo Next steps:
echo 1. Start your web server (XAMPP, WAMP, etc.)
echo 2. Open your browser and go to your application
echo 3. Login with: admin / admin123
echo ===============================================
pause
