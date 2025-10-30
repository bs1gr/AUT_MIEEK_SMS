@echo off
REM ========================================================================
REM  Student Management System - Universal Windows Launcher
REM  Works on ALL Windows versions (7, 8, 10, 11) without any prerequisites
REM  No PowerShell version issues, no execution policy blocks
REM ========================================================================

setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
color 0B

REM Set project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

REM Detect system language (default to English)
set "LANG=EN"
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do (
    set "LOCALE=%%a"
    if "!LOCALE:~0,2!"=="el" set "LANG=EL"
    if "!LOCALE:~0,2!"=="gr" set "LANG=EL"
)

REM Display logo
echo.
if "%LANG%"=="EL" (
    echo ================================================================
    echo.
    echo    ΣΥΣΤΗΜΑ ΔΙΑΧΕΙΡΙΣΗΣ ΦΟΙΤΗΤΩΝ - ΕΚΚΙΝΗΣΗ
    echo.
    echo    Εκδοση 1.2.0 - Συμβατο με ολα τα Windows
    echo.
    echo ================================================================
) else (
    echo ================================================================
    echo.
    echo    STUDENT MANAGEMENT SYSTEM - UNIVERSAL LAUNCHER
    echo.
    echo    Version 1.2.0 - Works on ALL Windows versions
    echo.
    echo ================================================================
)
echo.

REM ========================================================================
REM STEP 1: Detect what we have (Docker-first approach)
REM ========================================================================

if "%LANG%"=="EL" (
    echo [1/6] Ελεγχος απαιτησεων συστηματος...
) else (
    echo [1/6] Checking system requirements...
)
echo.

set "PYTHON_OK=0"
set "NODE_OK=0"
set "DOCKER_OK=0"
set "INSTALLED=0"

REM Check Docker FIRST (recommended for end users)
docker --version >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Docker: Βρεθηκε ^(ΣΥΝΙΣΤΩΜΕΝΟ^)
    ) else (
        echo [OK] Docker: Found ^(RECOMMENDED^)
    )
    set "DOCKER_OK=1"
) else (
    if "%LANG%"=="EL" (
        echo [--] Docker: Δεν βρεθηκε
        echo     Σημειωση: Το Docker ειναι ο απλουστερος τροπος εκτελεσης
        echo     Ληψη απο: https://www.docker.com/products/docker-desktop/
    ) else (
        echo [--] Docker: Not found
        echo     Note: Docker is the simplest way to run this application
        echo     Download from: https://www.docker.com/products/docker-desktop/
    )
)

REM Check Python (for native development mode)
python --version >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Python: Βρεθηκε ^(για λειτουργια αναπτυξης^)
    ) else (
        echo [OK] Python: Found ^(for development mode^)
    )
    set "PYTHON_OK=1"
) else (
    if "%LANG%"=="EL" (
        echo [--] Python: Δεν βρεθηκε
    ) else (
        echo [--] Python: Not found
    )
)

REM Check Node.js (for native development mode)
node --version >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Node.js: Βρεθηκε ^(για λειτουργια αναπτυξης^)
    ) else (
        echo [OK] Node.js: Found ^(for development mode^)
    )
    set "NODE_OK=1"
) else (
    if "%LANG%"=="EL" (
        echo [--] Node.js: Δεν βρεθηκε
    ) else (
        echo [--] Node.js: Not found
    )
)

echo.

REM ========================================================================
REM STEP 2: Ensure .env files exist
REM ========================================================================

if "%LANG%"=="EL" (
    echo [2/6] Ελεγχος διαμορφωσης περιβαλλοντος...
) else (
    echo [2/6] Checking environment configuration...
)
echo.

set "ENV_CREATED=0"

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        if "%LANG%"=="EL" (
            echo Δημιουργια backend/.env απο .env.example...
        ) else (
            echo Creating backend/.env from .env.example...
        )
        copy /Y "backend\.env.example" "backend\.env" >nul
        set "ENV_CREATED=1"
    ) else (
        if "%LANG%"=="EL" (
            echo ΠΡΟΕΙΔΟΠΟΙΗΣΗ: backend/.env.example δεν βρεθηκε
        ) else (
            echo WARNING: backend/.env.example not found
        )
    )
) else (
    if "%LANG%"=="EL" (
        echo [OK] backend/.env υπαρχει
    ) else (
        echo [OK] backend/.env exists
    )
)

if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        if "%LANG%"=="EL" (
            echo Δημιουργια frontend/.env απο .env.example...
        ) else (
            echo Creating frontend/.env from .env.example...
        )
        copy /Y "frontend\.env.example" "frontend\.env" >nul
        set "ENV_CREATED=1"
    ) else (
        if "%LANG%"=="EL" (
            echo ΠΡΟΕΙΔΟΠΟΙΗΣΗ: frontend/.env.example δεν βρεθηκε
        ) else (
            echo WARNING: frontend/.env.example not found
        )
    )
) else (
    if "%LANG%"=="EL" (
        echo [OK] frontend/.env υπαρχει
    ) else (
        echo [OK] frontend/.env exists
    )
)

if !ENV_CREATED! equ 1 (
    if "%LANG%"=="EL" (
        echo [OK] Αρχεια διαμορφωσης δημιουργηθηκαν
    ) else (
        echo [OK] Configuration files created
    )
)

echo.

REM ========================================================================
REM STEP 3: Check if already installed
REM ========================================================================

if "%LANG%"=="EL" (
    echo [3/6] Ελεγχος καταστασης εγκαταστασης...
) else (
    echo [3/6] Checking installation status...
)
echo.

if exist "backend\venv\" (
    if exist "data\student_management.db" (
        if "%LANG%"=="EL" (
            echo [OK] Το συστημα ειναι εγκατεστημενο
        ) else (
            echo [OK] System is installed
        )
        set "INSTALLED=1"
    )
)

if !INSTALLED! equ 0 (
    if "%LANG%"=="EL" (
        echo [!!] Απαιτειται εγκατασταση
    ) else (
        echo [!!] Installation required
    )
)

echo.

REM ========================================================================
REM STEP 4: Check what's running
REM ========================================================================

if "%LANG%"=="EL" (
    echo [4/6] Ελεγχος υπηρεσιων που εκτελουνται...
) else (
    echo [4/6] Checking running services...
)
echo.

set "DOCKER_RUNNING=0"
set "BACKEND_RUNNING=0"

REM Check Docker containers
docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Το Docker εκτελειται
    ) else (
        echo [OK] Docker containers are running
    )
    set "DOCKER_RUNNING=1"
)

REM Check if backend is running on port 8000
netstat -ano | findstr ":8000" >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Backend εκτελειται στη θυρα 8000
    ) else (
        echo [OK] Backend running on port 8000
    )
    set "BACKEND_RUNNING=1"
)

if !DOCKER_RUNNING! equ 0 if !BACKEND_RUNNING! equ 0 (
    if "%LANG%"=="EL" (
        echo [--] Καμια υπηρεσια δεν εκτελειται
    ) else (
        echo [--] No services currently running
    )
)

echo.

REM ========================================================================
REM STEP 5: Decide what to do
REM ========================================================================

if "%LANG%"=="EL" (
    echo [5/6] Καθορισμος ενεργειας...
) else (
    echo [5/6] Determining action...
)
echo.

REM If Docker is running, just show URLs
if !DOCKER_RUNNING! equ 1 (
    echo ================================================================
    if "%LANG%"=="EL" (
        echo   [OK] Το συστημα εκτελειται ηδη σε λειτουργια Docker
    ) else (
        echo   [OK] System already running in Docker mode
    )
    echo ================================================================
    echo.
    if "%LANG%"=="EL" (
        echo   Εφαρμογη:         http://localhost:8080
        echo   Πινακας Ελεγχου:  http://localhost:8080/control
        echo   Τεκμηριωση API:   http://localhost:8080/docs
        echo.
        echo ================================================================
        echo.
        echo Πατηστε οποιο πληκτρο για μενου, η Ctrl+C για εξοδο...
    ) else (
        echo   Application:      http://localhost:8080
        echo   Control Panel:    http://localhost:8080/control
        echo   API Docs:         http://localhost:8080/docs
        echo.
        echo ================================================================
        echo.
        echo Press any key for menu, or Ctrl+C to exit...
    )
    pause >nul
    goto :INTERACTIVE_MENU
)

REM If backend is running, show native URLs
if !BACKEND_RUNNING! equ 1 (
    echo ================================================================
    if "%LANG%"=="EL" (
        echo   [OK] Το συστημα εκτελειται σε λειτουργια αναπτυξης
    ) else (
        echo   [OK] System already running in Native mode
    )
    echo ================================================================
    echo.
    if "%LANG%"=="EL" (
        echo   Backend API:      http://localhost:8000
        echo   Frontend:         http://localhost:5173
        echo   Πινακας Ελεγχου:  http://localhost:8000/control
        echo.
        echo ================================================================
        echo.
        echo Πατηστε οποιο πληκτρο για μενου, η Ctrl+C για εξοδο...
    ) else (
        echo   Backend API:      http://localhost:8000
        echo   Frontend:         http://localhost:5173
        echo   Control Panel:    http://localhost:8000/control
        echo.
        echo ================================================================
        echo.
        echo Press any key for menu, or Ctrl+C to exit...
    )
    pause >nul
    goto :INTERACTIVE_MENU
)

REM If not installed, need to install first
if !INSTALLED! equ 0 (
    if "%LANG%"=="EL" (
        echo Ενεργεια: Απαιτειται πρωτη εγκατασταση
    ) else (
        echo Action: First-time installation required
    )
    goto :INSTALL
)

REM If installed but not running, start it
if "%LANG%"=="EL" (
    echo Ενεργεια: Εκκινηση εφαρμογης
) else (
    echo Action: Start the application
)
goto :START

REM ========================================================================
REM INSTALL - First time installation (Docker-first approach)
REM ========================================================================
:INSTALL
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΠΡΩΤΗ ΕΓΚΑΤΑΣΤΑΣΗ
) else (
    echo   FIRST-TIME INSTALLATION
)
echo ================================================================
echo.

REM Strongly prefer Docker
if !DOCKER_OK! equ 1 (
    if "%LANG%"=="EL" (
        echo [OK] Εντοπιστηκε Docker - Χρηση ΛΕΙΤΟΥΡΓΙΑΣ DOCKER ^(συνιστωμενο^)
        echo.
        echo Πλεονεκτηματα λειτουργιας Docker:
        echo   * Αναπτυξη ενος κλικ
        echo   * Χωρις συγκρουσεις εκδοσεων Python/Node.js
        echo   * Απομονωμενο περιβαλλον
        echo   * Ετοιμη διαμορφωση παραγωγης
    ) else (
        echo [OK] Docker detected - Using DOCKER MODE ^(recommended^)
        echo.
        echo Docker mode benefits:
        echo   * One-click deployment
        echo   * No Python/Node.js version conflicts
        echo   * Isolated environment
        echo   * Production-ready configuration
    )
    echo.
    goto :INSTALL_DOCKER
)

REM Docker not available - offer native mode for developers
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΠΡΟΕΙΔΟΠΟΙΗΣΗ: ΤΟ DOCKER ΔΕΝ ΕΙΝΑΙ ΔΙΑΘΕΣΙΜΟ
) else (
    echo   WARNING: DOCKER NOT AVAILABLE
)
echo ================================================================
echo.
if "%LANG%"=="EL" (
    echo Το Docker ειναι ο συνιστωμενος τροπος εκτελεσης.
    echo.
    echo Ωστοσο, μπορειτε να εγκαταστησετε σε ΛΕΙΤΟΥΡΓΙΑ ΑΝΑΠΤΥΞΗΣ αν:
    echo   * Ειστε προγραμματιστης που χρειαζεται λειτουργιες hot-reload
    echo   * Δεν μπορειτε να εγκαταστησετε Docker σε αυτο το συστημα
    echo.
    echo Η λειτουργια αναπτυξης απαιτει:
    echo   * Python 3.11+
    echo   * Node.js 18+
    echo   * Χειροκινητη διαχειριση εξαρτησεων
) else (
    echo Docker is the recommended way to run this application.
    echo.
    echo However, you can install in NATIVE DEVELOPMENT MODE if you are:
    echo   * A developer who needs hot-reload features
    echo   * Unable to install Docker on this system
    echo.
    echo Native mode requires:
    echo   * Python 3.11+
    echo   * Node.js 18+
    echo   * Manual dependency management
)
echo.
if "%LANG%"=="EL" (
    set /p "use_native=Θελετε να συνεχισετε με λειτουργια αναπτυξης; (ναι/οχι): "
) else (
    set /p "use_native=Do you want to proceed with Native mode? (yes/no): "
)

if /i not "%use_native%"=="yes" if /i not "%use_native%"=="ναι" if /i not "%use_native%"=="ΝΑΙ" (
    echo.
    if "%LANG%"=="EL" (
        echo Η εγκατασταση ακυρωθηκε.
        echo.
        echo Για χρηση της συνιστωμενης λειτουργιας Docker:
        echo   1. Εγκαταστηστε Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo   2. Επανεκκινηστε τον υπολογιστη
        echo   3. Εκτελεστε ξανα αυτο το script
    ) else (
        echo Installation cancelled.
        echo.
        echo To use the recommended Docker mode:
        echo   1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo   2. Restart this computer
        echo   3. Run this script again
    )
    echo.
    pause
    exit /b 1
)

goto :INSTALL_NATIVE

REM ========================================================================
REM Docker Installation (Recommended)
REM ========================================================================
:INSTALL_DOCKER
if "%LANG%"=="EL" (
    echo [6/6] Εγκατασταση με Docker...
) else (
    echo [6/6] Installing with Docker...
)
echo.

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    if "%LANG%"=="EL" (
        echo [XX] ΣΦΑΛΜΑ: docker-compose.yml δεν βρεθηκε
    ) else (
        echo [XX] ERROR: docker-compose.yml not found
    )
    pause
    exit /b 1
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if !errorlevel! neq 0 (
    if "%LANG%"=="EL" (
        echo [XX] ΣΦΑΛΜΑ: Το Docker Desktop δεν εκτελειται
        echo.
        echo Παρακαλω:
        echo   1. Ανοιξτε το Docker Desktop
        echo   2. Περιμενετε να ξεκινησει πληρως
        echo   3. Εκτελεστε ξανα αυτο το script
    ) else (
        echo [XX] ERROR: Docker Desktop is not running
        echo.
        echo Please:
        echo   1. Open Docker Desktop
        echo   2. Wait for it to fully start
        echo   3. Run this script again
    )
    echo.
    pause
    exit /b 1
)

if "%LANG%"=="EL" (
    echo Κατασκευη Docker image ^(μπορει να παρει μερικα λεπτα^)...
) else (
    echo Building Docker image ^(this may take a few minutes^)...
)

docker-compose build
if !errorlevel! neq 0 (
    if "%LANG%"=="EL" (
        echo [XX] Η κατασκευη Docker απετυχε
        echo.
        echo Αντιμετωπιση προβληματων:
        echo   * Βεβαιωθειτε οτι το Docker Desktop εκτελειται
        echo   * Ελεγξτε τη συνδεση διαδικτυου σας
        echo   * Δοκιμαστε να επανεκκινησετε το Docker Desktop
    ) else (
        echo [XX] Docker build failed
        echo.
        echo Troubleshooting:
        echo   * Ensure Docker Desktop is running
        echo   * Check your internet connection
        echo   * Try restarting Docker Desktop
    )
    echo.
    pause
    exit /b 1
)

if "%LANG%"=="EL" (
    echo [OK] Η εγκατασταση Docker ολοκληρωθηκε!
) else (
    echo [OK] Docker installation completed!
)
echo.
set "INSTALLED=1"
goto :START

REM ========================================================================
REM Native Installation (Development Mode)
REM ========================================================================
:INSTALL_NATIVE
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΕΓΚΑΤΑΣΤΑΣΗ ΛΕΙΤΟΥΡΓΙΑΣ ΑΝΑΠΤΥΞΗΣ
) else (
    echo   NATIVE DEVELOPMENT MODE INSTALLATION
)
echo ================================================================
echo.

REM Check prerequisites
if !PYTHON_OK! equ 0 (
    if "%LANG%"=="EL" (
        echo [XX] ΣΦΑΛΜΑ: Απαιτειται Python 3.11+ αλλα δεν βρεθηκε
        echo.
        echo Παρακαλω εγκαταστηστε Python απο: https://www.python.org/downloads/
        echo.
        echo Μετα την εγκατασταση:
        echo   1. Επανεκκινηστε αυτο το script
        echo   2. Βεβαιωθειτε οτι επιλεξατε "Add Python to PATH"
    ) else (
        echo [XX] ERROR: Python 3.11+ is required but not found
        echo.
        echo Please install Python from: https://www.python.org/downloads/
        echo.
        echo After installation:
        echo   1. Restart this script
        echo   2. Make sure to check "Add Python to PATH" during installation
    )
    echo.
    pause
    exit /b 1
)

if !NODE_OK! equ 0 (
    if "%LANG%"=="EL" (
        echo [XX] ΣΦΑΛΜΑ: Απαιτειται Node.js 18+ αλλα δεν βρεθηκε
        echo.
        echo Παρακαλω εγκαταστηστε Node.js απο: https://nodejs.org/
        echo.
        echo Μετα την εγκατασταση:
        echo   1. Επανεκκινηστε αυτο το script
        echo   2. Επιλεξτε την LTS ^(Long Term Support^) εκδοση
    ) else (
        echo [XX] ERROR: Node.js 18+ is required but not found
        echo.
        echo Please install Node.js from: https://nodejs.org/
        echo.
        echo After installation:
        echo   1. Restart this script
        echo   2. Choose the LTS ^(Long Term Support^) version
    )
    echo.
    pause
    exit /b 1
)

if "%LANG%"=="EL" (
    echo [6/6] Εκτελεση εγκαταστασης αναπτυξης...
) else (
    echo [6/6] Running native installation...
)
echo.

REM Create backend venv
if not exist "backend\venv\" (
    if "%LANG%"=="EL" (
        echo Δημιουργια εικονικου περιβαλλοντος Python...
    ) else (
        echo Creating Python virtual environment...
    )
    cd backend
    python -m venv venv
    cd ..
)

REM Install backend dependencies
if "%LANG%"=="EL" (
    echo Εγκατασταση εξαρτησεων backend...
) else (
    echo Installing backend dependencies...
)
cd backend
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if !errorlevel! neq 0 (
    if "%LANG%"=="EL" (
        echo [XX] Αποτυχια εγκαταστασης εξαρτησεων backend
    ) else (
        echo [XX] Failed to install backend dependencies
    )
    cd ..
    pause
    exit /b 1
)

REM Run migrations
if "%LANG%"=="EL" (
    echo Εκτελεση μεταναστευσεων βασης δεδομενων...
) else (
    echo Running database migrations...
)
alembic upgrade head
if !errorlevel! neq 0 (
    if "%LANG%"=="EL" (
        echo [XX] Η μεταναστευση βασης δεδομενων απετυχε
    ) else (
        echo [XX] Database migration failed
    )
    cd ..
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
if not exist "frontend\node_modules\" (
    if "%LANG%"=="EL" (
        echo Εγκατασταση εξαρτησεων frontend...
    ) else (
        echo Installing frontend dependencies...
    )
    cd frontend
    call npm install
    if !errorlevel! neq 0 (
        if "%LANG%"=="EL" (
            echo [XX] Αποτυχια εγκαταστασης εξαρτησεων frontend
        ) else (
            echo [XX] Failed to install frontend dependencies
        )
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

echo.
if "%LANG%"=="EL" (
    echo [OK] Η εγκατασταση αναπτυξης ολοκληρωθηκε επιτυχως!
    echo.
    echo Εκκινηση εφαρμογης...
) else (
    echo [OK] Native installation completed successfully!
    echo.
    echo Starting the application...
)
timeout /t 2 /nobreak >nul
goto :START

REM ========================================================================
REM START - Start the application (Docker-first)
REM ========================================================================
:START
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΕΚΚΙΝΗΣΗ ΕΦΑΡΜΟΓΗΣ
) else (
    echo   STARTING APPLICATION
)
echo ================================================================
echo.

REM Try Docker first (recommended)
if !DOCKER_OK! equ 1 (
    if "%LANG%"=="EL" (
        echo Προσπαθεια εκκινησης σε λειτουργια Docker ^(συνιστωμενο^)...
    ) else (
        echo Attempting to start in Docker mode ^(recommended^)...
    )
    
    docker-compose up -d
    if !errorlevel! equ 0 (
        REM Wait a moment for containers to start
        timeout /t 3 /nobreak >nul
        
        REM Verify containers are actually running
        docker ps | findstr /i "sms-fullstack" >nul 2>&1
        if !errorlevel! equ 0 (
            echo.
            if "%LANG%"=="EL" (
                echo [OK] Η εφαρμογη εκκινησε επιτυχως σε ΛΕΙΤΟΥΡΓΙΑ DOCKER!
            ) else (
                echo [OK] Application started successfully in DOCKER MODE!
            )
            echo.
            echo ================================================================
            if "%LANG%"=="EL" (
                echo   ΠΡΟΣΒΑΣΗ ΣΤΗΝ ΕΦΑΡΜΟΓΗ ΣΑΣ
            ) else (
                echo   ACCESS YOUR APPLICATION
            )
            echo ================================================================
            echo.
            if "%LANG%"=="EL" (
                echo   Εφαρμογη:         http://localhost:8080
                echo   Πινακας Ελεγχου:  http://localhost:8080/control
                echo   Τεκμηριωση API:   http://localhost:8080/docs
                echo.
                echo   Λειτουργια: Docker ^(Ετοιμο για Παραγωγη^)
                echo.
                echo ================================================================
                echo.
                echo Για διακοπη: Εκτελεστε ξανα αυτο το script και επιλεξτε Stop
                echo Η χρησιμοποιηστε: docker-compose down
            ) else (
                echo   Application:      http://localhost:8080
                echo   Control Panel:    http://localhost:8080/control
                echo   API Docs:         http://localhost:8080/docs
                echo.
                echo   Mode: Docker ^(Production-Ready^)
                echo.
                echo ================================================================
                echo.
                echo To stop: Run this script again and select Stop option
                echo Or use: docker-compose down
            )
            echo.
            pause
            exit /b 0
        ) else (
            if "%LANG%"=="EL" (
                echo [!!] Τα containers εκκινησαν αλλα δεν εκτελουνται
                echo Ελεγξτε τα logs: docker-compose logs
            ) else (
                echo [!!] Containers started but not running
                echo Check logs: docker-compose logs
            )
            echo.
        )
    ) else (
        if "%LANG%"=="EL" (
            echo [!!] Η εκκινηση Docker απετυχε
        ) else (
            echo [!!] Docker start failed
        )
        echo.
    )
)

REM Fallback to Native mode (development)
if !PYTHON_OK! equ 1 if !NODE_OK! equ 1 (
    if "%LANG%"=="EL" (
        echo Docker μη διαθεσιμο, χρηση Λειτουργιας Αναπτυξης...
        echo.
        echo ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Η λειτουργια αναπτυξης ειναι μονο για προγραμματιστες
        echo    Για παραγωγη, παρακαλω εγκαταστηστε Docker
    ) else (
        echo Docker unavailable, falling back to Native Development Mode...
        echo.
        echo WARNING: Native mode is for developers only
        echo    For production use, please install Docker
    )
    echo.
    timeout /t 3 /nobreak
    goto :START_NATIVE
)

REM Neither mode available
if "%LANG%"=="EL" (
    echo [XX] ΣΦΑΛΜΑ: Αδυναμια εκκινησης εφαρμογης
    echo.
    echo Ουτε το Docker ουτε οι προαπαιτουμενες λειτουργιας αναπτυξης πληρουνται.
    echo.
    echo Συνιστωμενο: Εγκατασταση Docker Desktop
    echo   Ληψη: https://www.docker.com/products/docker-desktop/
    echo.
    echo Εναλλακτικα: Εγκατασταση Python 3.11+ και Node.js 18+ για λειτουργια αναπτυξης
) else (
    echo [XX] ERROR: Cannot start application
    echo.
    echo Neither Docker nor Native mode prerequisites are met.
    echo.
    echo Recommended: Install Docker Desktop
    echo   Download: https://www.docker.com/products/docker-desktop/
    echo.
    echo Alternative: Install Python 3.11+ and Node.js 18+ for development mode
)
echo.
pause
exit /b 1

REM ========================================================================
REM START NATIVE - Native development mode
REM ========================================================================
:START_NATIVE
if "%LANG%"=="EL" (
    echo Εκκινηση διακομιστη backend...
) else (
    echo Starting backend server...
)
start "SMS Backend" cmd /k "cd /d "%PROJECT_ROOT%backend" && venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
if "%LANG%"=="EL" (
    echo Εκκινηση διακομιστη frontend...
) else (
    echo Starting frontend server...
)
start "SMS Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo.
if "%LANG%"=="EL" (
    echo [OK] Η εφαρμογη εκκινησε σε ΛΕΙΤΟΥΡΓΙΑ ΑΝΑΠΤΥΞΗΣ
) else (
    echo [OK] Application started in NATIVE DEVELOPMENT MODE
)
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΠΡΟΣΒΑΣΗ ΣΤΗΝ ΕΦΑΡΜΟΓΗ ΣΑΣ ^(Λειτουργια Αναπτυξης^)
) else (
    echo   ACCESS YOUR APPLICATION ^(Development Mode^)
)
echo ================================================================
echo.
if "%LANG%"=="EL" (
    echo   Backend API:      http://localhost:8000
    echo   Frontend:         http://localhost:5173
    echo   Πινακας Ελεγχου:  http://localhost:8000/control
    echo   Τεκμηριωση API:   http://localhost:8000/docs
    echo.
    echo   Λειτουργια: Αναπτυξης ^(Μονο για Προγραμματιστες^)
    echo.
    echo ================================================================
    echo.
    echo Και τα δυο παραθυρα τερματικου θα παραμεινουν ανοιχτα για παρακολουθηση.
    echo Κλειστε τα για διακοπη των υπηρεσιων, η χρησιμοποιηστε την επιλογη Stop.
) else (
    echo   Backend API:      http://localhost:8000
    echo   Frontend:         http://localhost:5173
    echo   Control Panel:    http://localhost:8000/control
    echo   API Docs:         http://localhost:8000/docs
    echo.
    echo   Mode: Native ^(Development Only^)
    echo.
    echo ================================================================
    echo.
    echo Both terminal windows will stay open for monitoring.
    echo Close them to stop the services, or use the Stop option.
)
echo.
pause
exit /b 0

REM ========================================================================
REM INTERACTIVE MENU
REM ========================================================================
:INTERACTIVE_MENU
cls
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo.
    echo    ΣΥΣΤΗΜΑ ΔΙΑΧΕΙΡΙΣΗΣ ΦΟΙΤΗΤΩΝ - ΔΙΑΔΡΑΣΤΙΚΟ ΜΕΝΟΥ
    echo.
) else (
    echo.
    echo    STUDENT MANAGEMENT SYSTEM - INTERACTIVE MENU
    echo.
)
echo ================================================================
echo.
if "%LANG%"=="EL" (
    echo   1. Εκκινηση Εφαρμογης
    echo   2. Διακοπη Εφαρμογης
    echo   3. Προβολη Καταστασης
    echo   4. Επανεκκινηση Εφαρμογης
    echo   5. Επαναεγκατασταση
    echo   6. Ανοιγμα Εφαρμογης στο Προγραμμα Περιηγησης
    echo   7. Ανοιγμα Πινακα Ελεγχου
    echo   8. Προβολη Τεκμηριωσης
    echo   0. Εξοδος
    echo.
    set /p "choice=Επιλεξτε επιλογη ^(0-8^): "
) else (
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
    set /p "choice=Select option ^(0-8^): "
)

if "%choice%"=="1" goto :START
if "%choice%"=="2" goto :STOP
if "%choice%"=="3" goto :STATUS
if "%choice%"=="4" goto :RESTART
if "%choice%"=="5" goto :REINSTALL
if "%choice%"=="6" goto :OPEN_APP
if "%choice%"=="7" goto :OPEN_CONTROL
if "%choice%"=="8" goto :OPEN_DOCS
if "%choice%"=="0" exit /b 0

if "%LANG%"=="EL" (
    echo Μη εγκυρη επιλογη. Παρακαλω δοκιμαστε ξανα.
) else (
    echo Invalid choice. Please try again.
)
timeout /t 2 /nobreak >nul
goto :INTERACTIVE_MENU

REM ========================================================================
REM STOP - Stop all services
REM ========================================================================
:STOP
echo.
if "%LANG%"=="EL" (
    echo Διακοπη ολων των υπηρεσιων...
) else (
    echo Stopping all services...
)
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

if "%LANG%"=="EL" (
    echo [OK] Ολες οι υπηρεσιες διακοπηκαν
) else (
    echo [OK] All services stopped
)
echo.
pause
goto :INTERACTIVE_MENU

REM ========================================================================
REM STATUS - Show current status
REM ========================================================================
:STATUS
echo.
echo ================================================================
if "%LANG%"=="EL" (
    echo   ΚΑΤΑΣΤΑΣΗ ΣΥΣΤΗΜΑΤΟΣ
) else (
    echo   SYSTEM STATUS
)
echo ================================================================
echo.

docker ps 2>nul | findstr /i "sms-fullstack" >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Docker: ΕΚΤΕΛΕΙΤΑΙ
        echo     Προσβαση: http://localhost:8080
    ) else (
        echo [OK] Docker: RUNNING
        echo     Access: http://localhost:8080
    )
) else (
    if "%LANG%"=="EL" (
        echo [--] Docker: ΔΙΑΚΟΠΗ
    ) else (
        echo [--] Docker: STOPPED
    )
)

netstat -ano | findstr ":8000" >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Backend: ΕΚΤΕΛΕΙΤΑΙ στη θυρα 8000
    ) else (
        echo [OK] Backend: RUNNING on port 8000
    )
) else (
    if "%LANG%"=="EL" (
        echo [--] Backend: ΔΙΑΚΟΠΗ
    ) else (
        echo [--] Backend: STOPPED
    )
)

netstat -ano | findstr ":5173" >nul 2>&1
if !errorlevel! equ 0 (
    if "%LANG%"=="EL" (
        echo [OK] Frontend: ΕΚΤΕΛΕΙΤΑΙ στη θυρα 5173
    ) else (
        echo [OK] Frontend: RUNNING on port 5173
    )
) else (
    if "%LANG%"=="EL" (
        echo [--] Frontend: ΔΙΑΚΟΠΗ
    ) else (
        echo [--] Frontend: STOPPED
    )
)

echo.
echo ================================================================
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
if "%LANG%"=="EL" (
    echo ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Αυτο θα διαγραψει δεδομενα και θα επανεγκαταστησει τα παντα
    echo.
    set /p "confirm=Ειστε σιγουροι; ^(ναι/οχι^): "
) else (
    echo WARNING: This will delete data and reinstall everything
    echo.
    set /p "confirm=Are you sure? ^(yes/no^): "
)

if /i not "%confirm%"=="yes" if /i not "%confirm%"=="ναι" if /i not "%confirm%"=="ΝΑΙ" goto :INTERACTIVE_MENU

call :STOP

if "%LANG%"=="EL" (
    echo Καθαρισμος εγκαταστασης...
) else (
    echo Cleaning installation...
)
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
    if "%LANG%"=="EL" (
        echo Το README.md δεν βρεθηκε
    ) else (
        echo README.md not found
    )
    pause
)
goto :INTERACTIVE_MENU
