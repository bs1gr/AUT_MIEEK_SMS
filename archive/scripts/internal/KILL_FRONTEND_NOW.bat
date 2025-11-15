@echo off
echo.
echo ========================================
echo   EMERGENCY FRONTEND SHUTDOWN (MANUAL)
echo ========================================
echo.
echo This batch helper will NOT automatically run the destructive PowerShell script.
echo To run the emergency frontend shutdown interactively, open PowerShell and run:
echo   . "%~dp0KILL_FRONTEND_NOW.ps1" -Confirm
echo
echo The PowerShell script requires the -Confirm switch to proceed. This file exists
echo only as a pointer for operators; it intentionally does not execute the script.
