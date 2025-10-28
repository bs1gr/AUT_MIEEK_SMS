@echo off
echo.
echo ============================================================
echo   Student Management System - Cleanup Utility
echo ============================================================
echo.
echo This will move obsolete files to the Obsolete folder.
echo.
pause

powershell -ExecutionPolicy Bypass -File "%~dp0CLEANUP.ps1"
