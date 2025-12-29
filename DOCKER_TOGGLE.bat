@echo off
REM OPERATOR-ONLY: This script is restricted to infrastructure operators
REM DOCKER_TOGGLE.bat - Toggle Docker container state helper script
REM Version: 1.14.0

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo Student Management System - Docker Toggle Helper
echo.

REM Check for PowerShell and run the main Docker script
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '.\DOCKER.ps1') { .\DOCKER.ps1 -Help } else { Write-Host 'Error: DOCKER.ps1 not found'; exit 1 }"

if errorlevel 1 (
    echo.
    echo Error: Failed to execute Docker toggle script
    echo Please ensure PowerShell 7+ is installed and DOCKER.ps1 is in the same directory
    pause
    exit /b 1
)

endlocal
