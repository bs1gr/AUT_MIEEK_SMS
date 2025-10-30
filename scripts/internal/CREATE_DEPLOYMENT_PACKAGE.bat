@echo off
REM ============================================================================
REM   Create Deployment Package - Batch Wrapper
REM   
REM   Creates a portable package for offline deployment
REM ============================================================================

echo.
echo ================================================================================
echo   CREATE DEPLOYMENT PACKAGE
echo ================================================================================
echo.
echo   This will create a portable package that can be copied to other computers
echo   for offline installation.
echo.
echo   Options:
echo     1. Basic package (application code only)
echo     2. Full package with Docker image (recommended for offline)
echo     3. Compressed ZIP package with Docker image
echo.

set /p choice="Select option (1-3): "

if "%choice%"=="1" (
    echo.
    echo Creating basic package...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CREATE_DEPLOYMENT_PACKAGE.ps1"
) else if "%choice%"=="2" (
    echo.
    echo Creating full package with Docker image...
    echo This may take several minutes...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CREATE_DEPLOYMENT_PACKAGE.ps1" -IncludeDockerImage
) else if "%choice%"=="3" (
    echo.
    echo Creating compressed package with Docker image...
    echo This may take several minutes...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CREATE_DEPLOYMENT_PACKAGE.ps1" -IncludeDockerImage -CompressPackage
) else (
    echo.
    echo Invalid choice!
    pause
    exit /b 1
)

if errorlevel 1 (
    echo.
    echo [ERROR] Package creation failed!
    pause
    exit /b 1
)

echo.
echo Package created successfully!
echo.
pause
