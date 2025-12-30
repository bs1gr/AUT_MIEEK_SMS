@echo off
REM Docker Desktop Application Launcher & Container Management Shortcut
REM Version: 1.14.2
REM This script provides a user-friendly way to manage the SMS Docker container from a desktop shortcut
REM Supports: Start, Stop, and opening the web application

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Relaunch self elevated if not already admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Elevating to Administrator...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c """"%~f0""""' -Verb RunAs""
    exit /b
)

REM Detect PowerShell 7 (real binary); if missing, instruct user and exit (Windows PowerShell fallback is not reliable for this script)
set "PWSH_EXE="

REM Registry-based detection first (stable when PATH has WindowsApps alias)
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\PowerShellCore\\InstalledVersions\\*' -ErrorAction SilentlyContinue | ForEach-Object InstallLocation | Where-Object { $_ -and (Test-Path (Join-Path $_ 'pwsh.exe')) } | Select-Object -First 1)"`) do (
    set "PWSH_EXE=%%i\pwsh.exe"
)

if not defined PWSH_EXE if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "PWSH_EXE=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not defined PWSH_EXE if exist "%ProgramFiles(x86)%\PowerShell\7\pwsh.exe" set "PWSH_EXE=%ProgramFiles(x86)%\PowerShell\7\pwsh.exe"
if not defined PWSH_EXE if exist "%LOCALAPPDATA%\Microsoft\PowerShell\7\pwsh.exe" set "PWSH_EXE=%LOCALAPPDATA%\Microsoft\PowerShell\7\pwsh.exe"

if defined PWSH_EXE (
    "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "exit" 1>nul 2>&1
    if errorlevel 1 set "PWSH_EXE="
)

if not defined PWSH_EXE (
    echo.
    echo PowerShell 7 is required to manage the SMS Docker container.
    echo Please install PowerShell 7 from https://aka.ms/powershell and try again.
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
call "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%DOCKER.ps1" -Start
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
call "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%DOCKER.ps1" -Stop
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
call "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%DOCKER.ps1" -Stop
timeout /t 3 /nobreak
call "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%DOCKER.ps1" -Start
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
call "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%DOCKER.ps1" -Status
echo.
pause
goto menu

:view_logs
echo.
echo Container logs (last 50 lines):
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -Command "docker logs --tail 50 sms-app 2>nul || echo 'Container not running or not found'"
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
