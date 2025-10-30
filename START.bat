@echo off
REM ========================================================================
REM  Student Management System - Universal Windows Launcher
REM  Works on ALL Windows versions (7, 8, 10, 11) without any prerequisites
REM  No PowerShell version issues, no execution policy blocks
REM ========================================================================

setlocal enabledelayedexpansion
color 0B

REM Set project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

REM Display logo
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   🎓 STUDENT MANAGEMENT SYSTEM - UNIVERSAL LAUNCHER 🎓       ║
echo ║                                                              ║
echo ║   Version 1.2.0 - Works on ALL Windows versions             ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ========================================================================
REM STEP 1: Detect what we have
REM ========================================================================

echo [1/5] Checking system requirements...
echo.

set "PYTHON_OK=0"
set "NODE_OK=0"
set "DOCKER_OK=0"
set "INSTALLED=0"

REM Check Python
python --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Python: Found
    set "PYTHON_OK=1"
) else (
    echo ✗ Python: Not found
)

REM Check Node.js
node --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Node.js: Found
    set "NODE_OK=1"
) else (
    echo ✗ Node.js: Not found
)

REM Check Docker
docker --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Docker: Found
    set "DOCKER_OK=1"
) else (
    echo ✗ Docker: Not found
)

echo.

REM ========================================================================
REM STEP 2: Check if already installed
REM ========================================================================

echo [2/5] Checking installation status...
echo.

if exist "backend\venv\" (
    if exist "data\student_management.db" (
        echo ✓ System appears to be installed
        set "INSTALLED=1"
    )
)

if !INSTALLED! equ 0 (
    echo ! System not installed - will run installation
)

echo.

REM ========================================================================
REM STEP 3: Check what's running
REM ========================================================================

echo [3/5] Checking running services...
echo.

set "DOCKER_RUNNING=0"
set "BACKEND_RUNNING=0"

REM Check Docker containers
docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Docker containers are running
    set "DOCKER_RUNNING=1"
)

REM Check if backend is running on port 8000
netstat -ano | findstr ":8000" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Backend running on port 8000
    set "BACKEND_RUNNING=1"
)

if !DOCKER_RUNNING! equ 0 if !BACKEND_RUNNING! equ 0 (
    echo ! No services currently running
)

echo.

REM ========================================================================
REM STEP 4: Decide what to do
REM ========================================================================

echo [4/5] Determining action...
echo.

REM If Docker is running, just show URLs
if !DOCKER_RUNNING! equ 1 (
    echo ═══════════════════════════════════════════════════════════
    echo   ✓ System already running in Docker mode
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo   Application:    http://localhost:8080
    echo   Control Panel:  http://localhost:8080/control
    echo   API Docs:       http://localhost:8080/docs
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo Press any key to open interactive menu, or Ctrl+C to exit...
    pause >nul
    goto :INTERACTIVE_MENU
)

REM If backend is running, show native URLs
if !BACKEND_RUNNING! equ 1 (
    echo ═══════════════════════════════════════════════════════════
    echo   ✓ System already running in Native mode
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo   Backend API:    http://localhost:8000
    echo   Frontend:       http://localhost:5173
    echo   Control Panel:  http://localhost:8000/control
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo Press any key to open interactive menu, or Ctrl+C to exit...
    pause >nul
    goto :INTERACTIVE_MENU
)

REM If not installed, need to install first
if !INSTALLED! equ 0 (
    echo Action: First-time installation required
    goto :INSTALL
)

REM If installed but not running, start it
echo Action: Start the application
goto :START

REM ========================================================================
REM INSTALL - First time installation
REM ========================================================================
:INSTALL
echo.
echo ═══════════════════════════════════════════════════════════
echo   🚀 FIRST-TIME INSTALLATION
echo ═══════════════════════════════════════════════════════════
echo.

REM Check prerequisites
if !PYTHON_OK! equ 0 (
    echo ✗ ERROR: Python 3.11+ is required but not found
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo.
    echo After installation:
    echo   1. Restart this script
    echo   2. Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

if !NODE_OK! equ 0 (
    echo ✗ ERROR: Node.js 18+ is required but not found
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    echo After installation:
    echo   1. Restart this script
    echo   2. Choose the LTS (Long Term Support) version
    echo.
    pause
    exit /b 1
)

echo [5/5] Running installation...
echo.

REM If QUICKSTART.ps1 exists and PowerShell is available, use it
if exist "QUICKSTART.ps1" (
    where pwsh >nul 2>&1
    if !errorlevel! equ 0 (
        echo Using PowerShell 7 for installation...
        pwsh -NoProfile -ExecutionPolicy Bypass -File "QUICKSTART.ps1"
        goto :POST_INSTALL
    )
    
    where powershell >nul 2>&1
    if !errorlevel! equ 0 (
        echo Using Windows PowerShell for installation...
        powershell -NoProfile -ExecutionPolicy Bypass -File "QUICKSTART.ps1"
        goto :POST_INSTALL
    )
)

REM Fallback: Manual installation
echo Running manual installation...
echo.

REM Create backend venv
if not exist "backend\venv\" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call venv\Scripts\activate.bat
pip install --quiet -r requirements.txt
if !errorlevel! neq 0 (
    echo ✗ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Run migrations
echo Running database migrations...
alembic upgrade head
if !errorlevel! neq 0 (
    echo ✗ Database migration failed
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    if !errorlevel! neq 0 (
        echo ✗ Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

:POST_INSTALL
echo.
echo ✓ Installation completed successfully!
echo.
echo Starting the application...
timeout /t 2 /nobreak >nul
goto :START

REM ========================================================================
REM START - Start the application
REM ========================================================================
:START
echo.
echo ═══════════════════════════════════════════════════════════
echo   ▶️  STARTING APPLICATION
echo ═══════════════════════════════════════════════════════════
echo.

REM Prefer Docker if available
if !DOCKER_OK! equ 1 (
    echo Starting in Docker mode...
    docker-compose up -d
    if !errorlevel! equ 0 (
        echo.
        echo ✓ Application started successfully!
        echo.
        echo ═══════════════════════════════════════════════════════════
        echo   🌐 ACCESS YOUR APPLICATION
        echo ═══════════════════════════════════════════════════════════
        echo.
        echo   Application:    http://localhost:8080
        echo   Control Panel:  http://localhost:8080/control
        echo   API Docs:       http://localhost:8080/docs
        echo.
        echo   Mode: Docker (Production)
        echo.
        echo ═══════════════════════════════════════════════════════════
        echo.
        echo To stop: Run this script again and select Stop option
        echo.
        pause
        exit /b 0
    ) else (
        echo ✗ Docker start failed
        echo Falling back to native mode...
        echo.
    )
)

REM Native mode
echo Starting in Native mode...
echo.

REM Start backend
echo Starting backend server...
start "SMS Backend" cmd /k "cd /d "%PROJECT_ROOT%backend" && venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend server...
start "SMS Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo.
echo ✓ Application started successfully!
echo.
echo ═══════════════════════════════════════════════════════════
echo   🌐 ACCESS YOUR APPLICATION
echo ═══════════════════════════════════════════════════════════
echo.
echo   Backend API:    http://localhost:8000
echo   Frontend:       http://localhost:5173
echo   Control Panel:  http://localhost:8000/control
echo   API Docs:       http://localhost:8000/docs
echo.
echo   Mode: Native (Development)
echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo Both terminal windows will stay open for monitoring.
echo Close them to stop the services.
echo.
pause
exit /b 0

REM ========================================================================
REM INTERACTIVE MENU
REM ========================================================================
:INTERACTIVE_MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   🎓 STUDENT MANAGEMENT SYSTEM - INTERACTIVE MENU           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   1. Start Application
echo   2. Stop Application
echo   3. Show Status
echo   4. Restart Application
echo   5. Force Reinstall
echo   6. Open Application in Browser
echo   7. Open Control Panel
echo   8. View Documentation
echo   0. Exit
echo.
set /p "choice=Select option (0-8): "

if "%choice%"=="1" goto :START
if "%choice%"=="2" goto :STOP
if "%choice%"=="3" goto :STATUS
if "%choice%"=="4" goto :RESTART
if "%choice%"=="5" goto :REINSTALL
if "%choice%"=="6" goto :OPEN_APP
if "%choice%"=="7" goto :OPEN_CONTROL
if "%choice%"=="8" goto :OPEN_DOCS
if "%choice%"=="0" exit /b 0

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto :INTERACTIVE_MENU

REM ========================================================================
REM STOP - Stop all services
REM ========================================================================
:STOP
echo.
echo Stopping all services...
echo.

REM Stop Docker
docker-compose down >nul 2>&1

REM Stop backend processes
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Stop frontend processes
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo ✓ All services stopped
echo.
pause
goto :INTERACTIVE_MENU

REM ========================================================================
REM STATUS - Show current status
REM ========================================================================
:STATUS
echo.
echo ═══════════════════════════════════════════════════════════
echo   📊 SYSTEM STATUS
echo ═══════════════════════════════════════════════════════════
echo.

docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Docker: RUNNING
    echo   Access: http://localhost:8080
) else (
    echo ✗ Docker: STOPPED
)

netstat -ano | findstr ":8000" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Backend: RUNNING on port 8000
) else (
    echo ✗ Backend: STOPPED
)

netstat -ano | findstr ":5173" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Frontend: RUNNING on port 5173
) else (
    echo ✗ Frontend: STOPPED
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.
pause
goto :INTERACTIVE_MENU

REM ========================================================================
REM RESTART - Restart application
REM ========================================================================
:RESTART
call :STOP
timeout /t 2 /nobreak >nul
goto :START

REM ========================================================================
REM REINSTALL - Force reinstall
REM ========================================================================
:REINSTALL
echo.
echo ⚠️  WARNING: This will delete data and reinstall everything
echo.
set /p "confirm=Are you sure? (yes/no): "
if /i not "%confirm%"=="yes" goto :INTERACTIVE_MENU

call :STOP

echo Cleaning installation...
rd /s /q "backend\venv" 2>nul
rd /s /q "frontend\node_modules" 2>nul
rd /s /q "data" 2>nul

set "INSTALLED=0"
goto :INSTALL

REM ========================================================================
REM OPEN APPLICATION
REM ========================================================================
:OPEN_APP
docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    start http://localhost:8080
) else (
    start http://localhost:5173
)
goto :INTERACTIVE_MENU

REM ========================================================================
REM OPEN CONTROL PANEL
REM ========================================================================
:OPEN_CONTROL
docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    start http://localhost:8080/control
) else (
    start http://localhost:8000/control
)
goto :INTERACTIVE_MENU

REM ========================================================================
REM OPEN DOCS
REM ========================================================================
:OPEN_DOCS
if exist "README.md" (
    start README.md
) else (
    echo README.md not found
    pause
)
goto :INTERACTIVE_MENU
