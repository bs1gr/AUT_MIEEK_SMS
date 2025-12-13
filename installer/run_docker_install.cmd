@echo off
REM Unified wrapper: Always use DOCKER.ps1 -Install -Silent for both PowerShell 7+ and Windows PowerShell
cd /d "%~dp0"

REM Try PowerShell 7+ (pwsh)
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using PowerShell 7+...
    pwsh -ExecutionPolicy Bypass -NoProfile -File "DOCKER.ps1" -Install -Silent
    set "EXITCODE=%ERRORLEVEL%"
    goto :checkresult
)

REM Fallback: Windows PowerShell (PS5)
echo PowerShell 7 not found, using Windows PowerShell...
echo Note: Some features may require PowerShell 7+
powershell -ExecutionPolicy Bypass -NoProfile -File "DOCKER.ps1" -Install -Silent
set "EXITCODE=%ERRORLEVEL%"

:checkresult
if NOT "%EXITCODE%" == "0" (
    echo.
    echo Installation encountered an error. Please check the output above for details.
    echo You may need to install Docker Desktop and ensure it is running.
    pause
    exit /b %EXITCODE%
)
echo.
echo Docker installation and image build completed successfully!
echo You can now use the desktop shortcut or run DOCKER.ps1 to start SMS.
exit /b 0
