@echo off
REM DEPRECATED: scripts\legacy\INSTALL.bat
REM Use QUICKSTART.ps1 instead (intelligent setup & start)

setlocal
set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%\..

echo This installer is deprecated. Redirecting to QUICKSTART.ps1...

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\QUICKSTART.ps1" %*
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\QUICKSTART.ps1" %*
)

endlocal
exit /b %ERRORLEVEL%
