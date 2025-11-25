@echo off
REM Frontend Diagnostic Tool
echo.
echo ============================================================
echo   Frontend Diagnostic Tool
echo ============================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0DIAGNOSE_FRONTEND.ps1"
