@echo off
REM Sharbee Quick Setup Script for Windows
REM Run this after cloning the repository

echo ========================================
echo    Sharbee - Quick Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18 or higher from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking Node.js version...
node --version
echo [OK] Node.js found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Create required directories
echo Creating required directories...
if not exist "electron" mkdir electron
if not exist "out" mkdir out
echo [OK] Directories created
echo.

REM Build static export
echo Building Next.js static export...
call npm run export
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build static export
    pause
    exit /b 1
)
echo [OK] Static export built
echo.

echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start development: npm run electron:dev
echo   2. Package app:       npm run package
echo   3. Create installer:  npm run make
echo.
echo Documentation:
echo   - README.md        - User guide
echo   - DEVELOPMENT.md   - Developer guide
echo   - ARCHITECTURE.md  - Architecture overview
echo.
echo Happy coding!
pause
