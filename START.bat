@echo off
REM Student Management System - START.bat (Deprecated Wrapper)
REM This wrapper now forwards to QUICKSTART.ps1

setlocal
echo.
echo ===============================================
echo   START.bat is deprecated.
echo   Forwarding to QUICKSTART.ps1...
echo ===============================================
echo.

set "ROOT=%~dp0"
set "QS=%ROOT%QUICKSTART.ps1"

if not exist "%QS%" (
  echo ERROR: QUICKSTART.ps1 not found at "%QS%"
  exit /b 1
)

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%QS%" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%QS%" %*
)

exit /b %ERRORLEVEL%
