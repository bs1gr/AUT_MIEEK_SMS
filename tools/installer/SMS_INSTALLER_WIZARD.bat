@echo off
REM ============================================================================
REM   Student Management System - Installation Wizard Launcher
REM   Double-click this file to start the GUI installation wizard
REM ============================================================================

echo.
echo ================================================================================
echo   STUDENT MANAGEMENT SYSTEM - INSTALLATION WIZARD
echo ================================================================================
echo.
echo   Starting GUI installer...
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This installer requires administrator privileges.
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

REM Run the PowerShell GUI wizard with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SMS_INSTALLER_WIZARD.ps1"

REM Check if PowerShell exited with an error
if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed or was cancelled
    echo.
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
pause
