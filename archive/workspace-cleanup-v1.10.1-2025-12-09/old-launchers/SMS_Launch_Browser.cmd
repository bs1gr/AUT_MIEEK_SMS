@echo off
REM SMS Browser Launcher - Starts Docker container and opens browser
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Start the SMS application using the main launcher
call SMS_Launcher.cmd start

REM Wait a few seconds for the container to be ready
timeout /t 5 /nobreak >nul

REM Open browser to the SMS application
start http://localhost:8080

exit /b 0
