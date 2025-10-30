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
REM STEP 1: Detect what we have (Docker-first approach)
REM ========================================================================

echo [1/5] Checking system requirements...
echo.

set "PYTHON_OK=0"
set "NODE_OK=0"
set "DOCKER_OK=0"
set "INSTALLED=0"

REM Check Docker FIRST (recommended for end users)
docker --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Docker: Found (RECOMMENDED)
    set "DOCKER_OK=1"
) else (
    echo ✗ Docker: Not found
    echo   Note: Docker is the simplest way to run this application
    echo   Download from: https://www.docker.com/products/docker-desktop/
)

REM Check Python (for native development mode)
python --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Python: Found (for development mode)
    set "PYTHON_OK=1"
) else (
    echo ✗ Python: Not found
)

REM Check Node.js (for native development mode)
node --version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ Node.js: Found (for development mode)
    set "NODE_OK=1"
) else (
    echo ✗ Node.js: Not found
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
REM INSTALL - First time installation (Docker-first approach)
REM ========================================================================
:INSTALL
echo.
echo ═══════════════════════════════════════════════════════════
echo   🚀 FIRST-TIME INSTALLATION
echo ═══════════════════════════════════════════════════════════
echo.

REM Strongly prefer Docker
if !DOCKER_OK! equ 1 (
    echo ✓ Docker detected - Using DOCKER MODE (recommended)
    echo.
    echo Docker mode benefits:
    echo   • One-click deployment
    echo   • No Python/Node.js version conflicts
    echo   • Isolated environment
    echo   • Production-ready configuration
    echo.
    goto :INSTALL_DOCKER
)

REM Docker not available - offer native mode for developers
echo ═══════════════════════════════════════════════════════════
echo   ⚠️  DOCKER NOT AVAILABLE
echo ═══════════════════════════════════════════════════════════
echo.
echo Docker is the recommended way to run this application.
echo.
echo However, you can install in NATIVE DEVELOPMENT MODE if you are:
echo   • A developer who needs hot-reload features
echo   • Unable to install Docker on this system
echo.
echo Native mode requires:
echo   • Python 3.11+
echo   • Node.js 18+
echo   • Manual dependency management
echo.
set /p "use_native=Do you want to proceed with Native mode? (yes/no): "
if /i not "%use_native%"=="yes" (
    echo.
    echo Installation cancelled.
    echo.
    echo To use the recommended Docker mode:
    echo   1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo   2. Restart this computer
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)

goto :INSTALL_NATIVE

REM ========================================================================
REM Docker Installation (Recommended)
REM ========================================================================
:INSTALL_DOCKER
echo [5/5] Installing with Docker...
echo.

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ✗ ERROR: docker-compose.yml not found
    pause
    exit /b 1
)

echo Building Docker image (this may take a few minutes)...
docker-compose build
if !errorlevel! neq 0 (
    echo ✗ Docker build failed
    echo.
    echo Troubleshooting:
    echo   • Ensure Docker Desktop is running
    echo   • Check your internet connection
    echo   • Try restarting Docker Desktop
    echo.
    pause
    exit /b 1
)

echo ✓ Docker installation completed!
echo.
set "INSTALLED=1"
goto :START

REM ========================================================================
REM Native Installation (Development Mode)
REM ========================================================================
:INSTALL_NATIVE
echo.
echo ═══════════════════════════════════════════════════════════
echo   🔧 NATIVE DEVELOPMENT MODE INSTALLATION
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

echo [5/5] Running native installation...
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
echo ✓ Native installation completed successfully!
echo.
echo Starting the application...
timeout /t 2 /nobreak >nul
goto :START

REM ========================================================================
REM START - Start the application (Docker-first)
REM ========================================================================
:START
echo.
echo ═══════════════════════════════════════════════════════════
echo   ▶️  STARTING APPLICATION
echo ═══════════════════════════════════════════════════════════
echo.

REM Try Docker first (recommended)
if !DOCKER_OK! equ 1 (
    echo Attempting to start in Docker mode (recommended)...
    docker-compose up -d
    if !errorlevel! equ 0 (
        echo.
        echo ✓ Application started successfully in DOCKER MODE!
        echo.
        echo ═══════════════════════════════════════════════════════════
        echo   🌐 ACCESS YOUR APPLICATION
        echo ═══════════════════════════════════════════════════════════
        echo.
        echo   Application:    http://localhost:8080
        echo   Control Panel:  http://localhost:8080/control
        echo   API Docs:       http://localhost:8080/docs
        echo.
        echo   Mode: Docker (Production-Ready)
        echo.
        echo ═══════════════════════════════════════════════════════════
        echo.
        echo To stop: Run this script again and select Stop option
        echo Or use: docker-compose down
        echo.
        pause
        exit /b 0
    ) else (
        echo ⚠️  Docker start failed
        echo.
    )
)

REM Fallback to Native mode (development)
if !PYTHON_OK! equ 1 if !NODE_OK! equ 1 (
    echo Docker unavailable, falling back to Native Development Mode...
    echo.
    echo ⚠️  WARNING: Native mode is for developers only
    echo    For production use, please install Docker
    echo.
    timeout /t 3 /nobreak
    goto :START_NATIVE
)

REM Neither mode available
echo ✗ ERROR: Cannot start application
echo.
echo Neither Docker nor Native mode prerequisites are met.
echo.
echo Recommended: Install Docker Desktop
echo   Download: https://www.docker.com/products/docker-desktop/
echo.
echo Alternative: Install Python 3.11+ and Node.js 18+ for development mode
echo.
pause
exit /b 1

REM ========================================================================
REM START NATIVE - Native development mode
REM ========================================================================
:START_NATIVE
echo Starting backend server...
start "SMS Backend" cmd /k "cd /d "%PROJECT_ROOT%backend" && venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend server...
start "SMS Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo.
echo ✓ Application started in NATIVE DEVELOPMENT MODE
echo.
echo ═══════════════════════════════════════════════════════════
echo   🌐 ACCESS YOUR APPLICATION (Development Mode)
echo ═══════════════════════════════════════════════════════════
echo.
echo   Backend API:    http://localhost:8000
echo   Frontend:       http://localhost:5173
echo   Control Panel:  http://localhost:8000/control
echo   API Docs:       http://localhost:8000/docs
echo.
echo   Mode: Native (Development Only)
echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo Both terminal windows will stay open for monitoring.
echo Close them to stop the services, or use the Stop option.
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
