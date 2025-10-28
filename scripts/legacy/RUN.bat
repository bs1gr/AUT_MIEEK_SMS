@echo off
chcp 65001 >nul 2>&1

REM ============================================================================
REM   Student Management System - Single-File Startup
REM   MIEEK - AUT Automotive Engineering
REM ============================================================================

cd /d "%~dp0"
title SMS - Starting...

REM ============================================================================
REM Find Python
REM ============================================================================

set PYTHON_EXE=

REM Check if venv exists
if exist "backend\venv\Scripts\python.exe" (
    set PYTHON_EXE=backend\venv\Scripts\python.exe
    goto python_found
)

REM Check system Python
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_EXE=python
    goto python_found
)

REM Check py launcher
py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_EXE=py -3
    goto python_found
)

REM Check common paths
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python313\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python313\python.exe
    goto python_found
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe
    goto python_found
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe
    goto python_found
)

cls
echo.
echo ============================================================
echo   ERROR: Python not found!
echo ============================================================
echo.
echo   Please install Python 3.8+ from https://www.python.org
echo.
echo ============================================================
pause
exit /b 1

:python_found

REM ============================================================================
REM Find Node.js and npm
REM ============================================================================

set NPM_CMD=

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    cls
    echo.
    echo ============================================================
    echo   ERROR: Node.js not found!
    echo ============================================================
    echo.
    echo   Please install Node.js from https://nodejs.org
    echo.
    echo ============================================================
    pause
    exit /b 1
)

REM Test npm commands
npm --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set NPM_CMD=npm
    goto node_found
)

npm.cmd --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set NPM_CMD=npm.cmd
    goto node_found
)

cls
echo.
echo ============================================================
echo   ERROR: npm not found!
echo ============================================================
echo.
echo   Node.js might be corrupted.
echo   Please reinstall Node.js from https://nodejs.org
echo.
echo ============================================================
pause
exit /b 1

:node_found

REM ============================================================================
REM Check if servers are already running
REM ============================================================================

netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
set BACKEND_RUNNING=%ERRORLEVEL%

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
set FRONTEND_RUNNING=%ERRORLEVEL%

if %BACKEND_RUNNING% EQU 0 if %FRONTEND_RUNNING% EQU 0 (
    start "" "http://localhost:5173"
    exit /b 0
)

REM ============================================================================
REM Start servers
REM ============================================================================

if %BACKEND_RUNNING% NEQ 0 (
    echo Checking backend dependencies...
    "%PYTHON_EXE%" -c "import uvicorn, psutil" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Installing/updating backend dependencies...
        cd backend
        "%PYTHON_EXE%" -m pip install --upgrade pip --quiet --disable-pip-version-check
        "%PYTHON_EXE%" -m pip install -r requirements.txt --upgrade --quiet --disable-pip-version-check
        if %ERRORLEVEL% EQU 0 (
            echo   Dependencies installed successfully!
        ) else (
            echo   Warning: Some dependencies may have failed to install
        )
        cd ..
    ) else (
        echo   All backend dependencies are installed!
    )
    echo Starting backend server...
    start "Backend Server" /min cmd /c "cd /d "%~dp0" && "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
)

if %FRONTEND_RUNNING% NEQ 0 (
    if not exist "frontend\node_modules" (
        echo Installing frontend dependencies...
        cd frontend
        %NPM_CMD% install --silent
        cd ..
    )
    start "Frontend Server" /min cmd /c "cd /d "%~dp0frontend" && %NPM_CMD% run dev"
)

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
exit /b 0
