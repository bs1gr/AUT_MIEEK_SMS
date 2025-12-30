@echo off
REM Docker Desktop Application Launcher & Container Management Shortcut
REM Version: 1.14.0
REM This script provides a user-friendly way to manage the SMS Docker container from a desktop shortcut
REM Supports: Start, Stop, and opening the web application

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if running elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Administrator Rights Required
    echo.
    echo This script needs administrator privileges to manage Docker containers.
    echo Please run as Administrator or re-run with elevated privileges.
    echo.
    pause
    exit /b 1
)

echo.
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         Student Management System - Docker Manager            ║
echo ║                                                                ║
echo ║  Quick Container Control Menu                                 ║
echo ╠════════════════════════════════════════════════════════════════╣
echo ║  1) START container and open web app                          ║
echo ║  2) STOP container                                            ║
echo ║  3) RESTART container                                         ║
echo ║  4) CHECK container status                                    ║
echo ║  5) VIEW container logs                                       ║
echo ║  6) OPEN web app (if running)                                 ║
echo ║  Q) QUIT                                                      ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:menu
set /p choice="Select an option [1-6, Q]: "

if /i "%choice%"=="Q" goto quit
if "%choice%"=="1" goto start_container
if "%choice%"=="2" goto stop_container
if "%choice%"=="3" goto restart_container
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto view_logs
if "%choice%"=="6" goto open_app

echo Invalid selection. Please try again.
echo.
goto menu

:start_container
echo.
echo Starting SMS Docker container...
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command ".\DOCKER.ps1 -Start"
if %errorlevel% equ 0 (
    echo.
    echo Container started successfully. Waiting for service to be ready...
    timeout /t 5 /nobreak
    echo.
    echo Opening web application...
    start http://localhost:8080
) else (
    echo.
    echo Failed to start container. Check logs for details.
    echo.
)
goto menu

:stop_container
echo.
echo Stopping SMS Docker container...
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command ".\DOCKER.ps1 -Stop"
if %errorlevel% equ 0 (
    echo Container stopped successfully.
) else (
    echo Failed to stop container.
)
echo.
goto menu

:restart_container
echo.
echo Restarting SMS Docker container...
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command ".\DOCKER.ps1 -Stop"
timeout /t 3 /nobreak
call powershell -NoProfile -ExecutionPolicy Bypass -Command ".\DOCKER.ps1 -Start"
if %errorlevel% equ 0 (
    echo Container restarted successfully.
    echo.
    timeout /t 5 /nobreak
    echo Opening web application...
    start http://localhost:8080
) else (
    echo Failed to restart container.
)
echo.
goto menu

:check_status
echo.
echo Checking container status...
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command ".\DOCKER.ps1 -Status"
echo.
pause
goto menu

:view_logs
echo.
echo Container logs (last 50 lines):
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command "docker logs --tail 50 sms-fullstack 2>nul || echo 'Container not running or not found'"
echo.
pause
goto menu

:open_app
echo.
echo Opening web application at http://localhost:8080
echo.
start http://localhost:8080
echo.
goto menu

:quit
echo.
echo Closing Docker Manager...
echo.
exit /b 0

endlocal
