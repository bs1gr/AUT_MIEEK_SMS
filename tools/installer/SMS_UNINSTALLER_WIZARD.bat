@echo off
REM ============================================================================
REM   Student Management System - Uninstaller Wizard Launcher
REM   Double-click this file to start the GUI uninstallation wizard
REM ============================================================================

echo.
echo ================================================================================
echo   STUDENT MANAGEMENT SYSTEM - UNINSTALLER
echo ================================================================================
echo.
echo   Starting GUI uninstaller...
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This uninstaller requires administrator privileges.
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

REM Run the PowerShell GUI wizard with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SMS_UNINSTALLER_WIZARD.ps1"

REM Check if PowerShell exited with an error
if errorlevel 1 (
    echo.
    echo [ERROR] Uninstallation failed or was cancelled
    echo.
    pause
    exit /b 1
)

echo.
echo Uninstallation completed successfully!
echo.
pause
