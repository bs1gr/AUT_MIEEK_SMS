@echo off
REM Student Management System - ONE-CLICK Launcher (Windows Batch Wrapper)
REM For PowerShell 5.1 compatibility

echo.
echo ================================================================
echo   Student Management System - ONE CLICK Launcher
echo ================================================================
echo.

REM Check if PowerShell is available
where pwsh >nul 2>&1
if %errorlevel% equ 0 (
    echo Using PowerShell 7+...
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0ONE-CLICK.ps1" %*
) else (
    echo PowerShell 7+ not found, using Windows PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ONE-CLICK.ps1" %*
)

if %errorlevel% neq 0 (
    echo.
    echo ================================================================
    echo   An error occurred. Please check the output above.
    echo ================================================================
    echo.
    pause
)
