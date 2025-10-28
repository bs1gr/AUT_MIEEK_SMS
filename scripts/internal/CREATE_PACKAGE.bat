@echo off
echo.
echo ====================================================================
echo   Creating Deployment Package
echo ====================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0CREATE_PACKAGE.ps1"
echo.
pause
