@echo off
REM ============================================================================
REM   Student Management System - One-Click Installer (Batch Wrapper)
REM
REM   Double-click this file to start the installation!
REM ============================================================================

echo.
echo ================================================================================
echo   STUDENT MANAGEMENT SYSTEM - ONE-CLICK INSTALLER
echo ================================================================================
echo.
echo   Starting PowerShell installer...
echo.

REM Run the PowerShell installer with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALLER.ps1"

REM Check if PowerShell exited with an error
if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo.
    pause
    exit /b 1
)

echo.
echo Installation completed.
echo.
pause
