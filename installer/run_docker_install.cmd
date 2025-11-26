@echo off
REM Wrapper script to run DOCKER.ps1 -Install with proper PowerShell version
REM This ensures compatibility with both PS5 and PS7

cd /d "%~dp0"

REM Check if pwsh (PowerShell 7+) is available
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using PowerShell 7+...
    pwsh -ExecutionPolicy Bypass -NoProfile -File "DOCKER.ps1" -Install -Silent
    goto :end
)

REM Fallback: Try powershell with compatibility mode
echo PowerShell 7 not found, using Windows PowerShell...
echo Note: Some features may require PowerShell 7+

REM Create a simplified install script for PS5 compatibility
powershell -ExecutionPolicy Bypass -NoProfile -Command ^
    "Write-Host 'Checking Docker...'; ^
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { ^
        Write-Host 'ERROR: Docker not found. Please install Docker Desktop.' -ForegroundColor Red; ^
        exit 1 ^
    }; ^
    Write-Host 'Docker found.'; ^
    $version = (Get-Content VERSION -ErrorAction SilentlyContinue) -replace '\s',''; ^
    if (-not $version) { $version = 'latest' }; ^
    Write-Host \"Building image sms-fullstack:$version...\"; ^
    docker build -t \"sms-fullstack:$version\" -f docker/Dockerfile.fullstack . ; ^
    if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed!' -ForegroundColor Red; exit 1 }; ^
    Write-Host 'Creating volume...'; ^
    docker volume create sms_data 2>$null; ^
    Write-Host 'Build complete!' -ForegroundColor Green; ^
    Write-Host 'Run the desktop shortcut to start SMS.'"

:end
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation encountered an error.
    echo Please check the output above for details.
    pause
)
exit /b %ERRORLEVEL%
