@echo off
REM SMS Docker Toggle Script - Batch Version
REM More reliable than VBS for avoiding execution policy issues

cd /d "%~dp0"

REM Check if Docker is available
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not installed or not accessible.
    echo Please install Docker Desktop and ensure it's running.
    pause
    exit /b 1
)

REM Check if container is running
docker ps --filter "name=sms-app" --format "{{.Names}}" 2>nul | findstr "sms-app" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    REM Container is running - stop it
    echo Stopping SMS container...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "DOCKER.ps1" -Stop
) else (
    REM Container is not running - start it
    echo Starting SMS container...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "DOCKER.ps1" -Start
)

exit /b %ERRORLEVEL%