@echo off
echo ========================================
echo Firebase Backup Tool
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if firebase-admin is installed
npm list firebase-admin >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing firebase-admin...
    npm install firebase-admin
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install firebase-admin
        pause
        exit /b 1
    )
)

REM Check if service account file exists
if not exist "database\firebase-service-account.json" (
    echo ERROR: Firebase service account file not found!
    echo.
    echo Please follow these steps:
    echo 1. Go to Firebase Console ^> Project Settings ^> Service Accounts
    echo 2. Click "Generate new private key"
    echo 3. Save the file as "database\firebase-service-account.json"
    echo.
    pause
    exit /b 1
)

REM Create backups directory if it doesn't exist
if not exist "database\backups" (
    mkdir "database\backups"
)

echo Starting Firebase backup...
echo.

REM Run the backup script
node scripts\backup-all-firebase-data.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo ========================================
    echo.
    echo Backup files are saved in: database\backups\
    echo.
    echo Opening backup folder...
    start "" "database\backups"
) else (
    echo.
    echo ========================================
    echo Backup failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
)

echo.
pause
