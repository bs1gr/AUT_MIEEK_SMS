@echo off
echo.
echo ========================================
echo   EMERGENCY FRONTEND SHUTDOWN
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0KILL_FRONTEND_NOW.ps1"
