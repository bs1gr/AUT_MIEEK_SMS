@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%NATIVE_TOGGLE.ps1" %*
exit /b %ERRORLEVEL%
