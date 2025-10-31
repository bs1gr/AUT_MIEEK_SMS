@echo off
REM ========================================================================
REM  Student Management System - One-Click Installer
REM  No execution policy issues, no PowerShell complexity
REM  Works on any Windows without prerequisites
REM ========================================================================

setlocal EnableDelayedExpansion
title Student Management System - Installer

REM Get script directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo.
echo ================================================================
echo   Student Management System - Installer
echo ================================================================
echo.
echo This will set up everything automatically.
echo.

REM ========================================================================
REM Check for Python
REM ========================================================================

echo [1/4] Checking for Python...
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       Python found - using Python installer
    echo.
    python "%ROOT_DIR%install.py"
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ================================================================
        echo   Installation Complete!
        echo ================================================================
        echo.
        pause
        exit /b 0
    )
)

echo       Python not found - checking for Docker...

REM ========================================================================
REM Check for Docker
REM ========================================================================

where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Docker not found
    echo.
    echo You need either:
    echo   Option A: Python 3.11+ ^(run: python install.py^)
    echo   Option B: Docker Desktop
    echo.
    echo Download Docker Desktop from:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo After installing Docker Desktop, run this installer again.
    echo.
    pause
    exit /b 1
)

echo       Docker found!

REM Check if Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Docker is installed but not running
    echo.
    echo Please start Docker Desktop and try again.
    echo ^(Look for the Docker whale icon in your system tray^)
    echo.
    pause
    exit /b 1
)

echo       Docker daemon is running

REM ========================================================================
REM Setup with Docker
REM ========================================================================

echo.
echo [2/4] Reading version information...

REM Read VERSION file
set "APP_VERSION=latest"
if exist "VERSION" (
    set /p APP_VERSION=<VERSION
    echo       Building version: !APP_VERSION!
)

echo.
echo [3/4] Creating environment files...

REM Create .env files from templates if they don't exist
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo       Created .env
    )
)

REM Update or add VERSION to .env
if exist ".env" (
    findstr /B /C:"VERSION=" ".env" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        REM VERSION exists, update it
        powershell -NoProfile -Command "(Get-Content '.env') -replace '^VERSION=.*', 'VERSION=!APP_VERSION!' | Set-Content '.env'"
    ) else (
        REM VERSION doesn't exist, append it
        echo VERSION=!APP_VERSION!>> .env
    )
    echo       Set VERSION=!APP_VERSION! in .env
)

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy /Y "backend\.env.example" "backend\.env" >nul
        echo       Created backend\.env
    )
)

if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy /Y "frontend\.env.example" "frontend\.env" >nul
        echo       Created frontend\.env
    )
)

echo.
echo [4/4] Building Docker containers with version !APP_VERSION!...
echo       This may take a few minutes on first run...
echo.

REM Set VERSION environment variable for docker-compose
set VERSION=!APP_VERSION!

docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FAIL] Failed to build Docker containers
    echo.
    echo Troubleshooting:
    echo   1. Make sure Docker Desktop is running
    echo   2. Check docker-compose.yml exists
    echo   3. Try: docker compose down ^&^& docker compose up -d --build
    echo.
    pause
    exit /b 1
)

echo.
echo [5/5] Verifying containers...

timeout /t 3 /nobreak >nul

docker compose ps | findstr "Up" >nul
if %ERRORLEVEL% EQU 0 (
    echo       Containers are running!
) else (
    echo       Warning: Containers may still be starting...
)

echo.
echo ================================================================
echo   Installation Complete!
echo ================================================================
echo.
echo   Application is running at:
echo     Frontend:      http://localhost:8080
echo     API Docs:      http://localhost:8080/docs
echo     Control Panel: http://localhost:8080/control
echo.
echo   To stop:  docker compose down
echo   To start: docker compose up -d
echo.

REM Try to open browser
start http://localhost:8080

echo Opening browser...
echo.
pause
