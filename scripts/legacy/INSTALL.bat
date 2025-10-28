@echo off
echo.
echo ====================================================================
echo   Student Management System - Automated Installation
echo ====================================================================
echo.
echo This will install all dependencies and set up the application.
echo.
pause

echo.
echo [1/6] Checking Python installation...
python --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.10 or higher from: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version
echo Python OK!

echo.
echo [2/6] Checking Node.js installation...
node --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js 18 or higher from: https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo Node.js OK!

echo.
echo [3/6] Creating Python virtual environment...
cd backend
if exist venv (
    echo Virtual environment already exists.
) else (
    python -m venv venv
    echo Virtual environment created.
)

echo.
echo [4/6] Installing Python dependencies...
call .\venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies!
    pause
    exit /b 1
)
echo Python dependencies installed successfully!

echo.
echo [5/6] Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully!

echo.
echo [6/6] Creating necessary directories...
cd ..
if not exist "backups" mkdir backups
if not exist "logs" mkdir logs
if not exist "backend\logs" mkdir backend\logs
echo Directories created.

echo.
echo ====================================================================
echo   Installation Complete!
echo ====================================================================
echo.
echo Next steps:
echo   1. Run RUN.bat to start the application
echo   2. Open http://localhost:5173 in your browser
echo   3. Refer to INSTALL_GUIDE.md for detailed documentation
echo.
echo ====================================================================
echo.
echo.
echo ====================================================================
echo.
pause
