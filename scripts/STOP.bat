@echo off
echo.
echo ============================================================
echo   Stopping Student Management System...
echo ============================================================
echo.

cd /d "%~dp0"

echo Killing processes on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
    echo   Killing PID %%a
    taskkill /F /T /PID %%a >nul 2>&1
)

echo Killing processes on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    echo   Killing PID %%a
    taskkill /F /T /PID %%a >nul 2>&1
)

echo.
echo ============================================================
echo   Servers stopped!
echo ============================================================
echo.
pause
