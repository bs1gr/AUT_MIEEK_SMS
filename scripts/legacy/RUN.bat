@echo off
REM DEPRECATED: scripts\legacy\RUN.bat
REM Use QUICKSTART.ps1 instead (intelligent setup & start)

setlocal
set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%\..\..

REM Prefer PowerShell 7 (pwsh) if available
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\QUICKSTART.ps1" %*
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\QUICKSTART.ps1" %*
)

endlocal
exit /b %ERRORLEVEL%
