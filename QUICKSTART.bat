@echo off
REM Quick Start - Student Management System
REM Robust wrapper for QUICKSTART.ps1 with error handling

setlocal EnableDelayedExpansion

REM Get script directory (handles spaces in paths)
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%QUICKSTART.ps1"

REM Check if PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo [ERROR] QUICKSTART.ps1 not found in %SCRIPT_DIR%
    echo Please ensure you're running this from the project root directory.
    pause
    exit /b 1
)

echo Starting Student Management System...
echo.

REM Try PowerShell 7+ (pwsh) first - recommended
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [INFO] Using PowerShell 7+
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
    set "EXIT_CODE=!ERRORLEVEL!"
) else (
    REM Fallback to Windows PowerShell 5.1
    where powershell >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo [INFO] Using Windows PowerShell 5.1
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
        set "EXIT_CODE=!ERRORLEVEL!"
    ) else (
        echo [ERROR] PowerShell not found!
        echo.
        echo PowerShell is required to run this application.
        echo Please install PowerShell 7+ from: https://aka.ms/powershell
        echo Or use the built-in Windows PowerShell.
        pause
        exit /b 1
    )
)

REM Check exit code
if !EXIT_CODE! neq 0 (
    echo.
    echo [ERROR] Script failed with exit code: !EXIT_CODE!
    echo.
    echo Troubleshooting:
    echo  - Check setup.log for detailed error messages
    echo  - Ensure Python 3.11+ or Docker Desktop is installed
    echo  - Try running as Administrator if Docker is needed
    echo  - Check that no antivirus is blocking the script
    echo.
    pause
)

endlocal
exit /b %EXIT_CODE%
