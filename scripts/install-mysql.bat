@echo off
echo ========================================
echo VMAX MySQL Installation Script
echo ========================================
echo.

echo Step 1: Creating database and importing schema...
echo Please ensure MySQL is running and you have admin credentials.
echo.

set /p MYSQL_USER=Enter MySQL username (default: root): 
if "%MYSQL_USER%"=="" set MYSQL_USER=root

set /p MYSQL_PASS=Enter MySQL password: 

echo.
echo Creating database 'vmax'...
mysql -u %MYSQL_USER% -p%MYSQL_PASS% -e "CREATE DATABASE IF NOT EXISTS vmax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database. Please check your MySQL credentials.
    pause
    exit /b 1
)

echo.
echo Importing main schema...
mysql -u %MYSQL_USER% -p%MYSQL_PASS% vmax < "../database/tables.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to import main schema.
    pause
    exit /b 1
)

echo.
echo Importing additional tables and indexes...
mysql -u %MYSQL_USER% -p%MYSQL_PASS% vmax < "../database/additional_tables.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to import additional tables.
    pause
    exit /b 1
)

echo.
echo Step 2: Running verification script...
php verify-migration.php

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update api/config.php with your database credentials
echo 2. Configure your web server to serve the application
echo 3. Test the application by logging in
echo 4. Create team leader users if needed
echo.
echo For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
pause
