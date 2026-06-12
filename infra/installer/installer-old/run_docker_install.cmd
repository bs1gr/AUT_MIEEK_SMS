@echo off
REM Unified installer wrapper: run DOCKER.ps1 -Install -Silent only.
REM This keeps installer behavior focused on preparing runtime images/config
REM without starting the compose stack during setup.
REM Adds robust pwsh detection, logging, and a readable pause on failure.

setlocal EnableExtensions EnableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "WRAP_LOG=%SCRIPT_DIR%DOCKER_INSTALL_WRAPPER.log"
if exist "%WRAP_LOG%" del "%WRAP_LOG%" >nul 2>&1

echo ================================================== >> "%WRAP_LOG%"
echo  run_docker_install.cmd started %date% %time% >> "%WRAP_LOG%"
echo ================================================== >> "%WRAP_LOG%"

echo Detecting PowerShell 7... >> "%WRAP_LOG%"
set "PWSH_EXE="

REM Prefer real installs first (avoid WindowsApps alias that just prints "Find in Microsoft Store")

REM Registry-based detection (most reliable when PATH shows WindowsApps alias)
if not defined PWSH_EXE (
    for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\PowerShellCore\\InstalledVersions\\*' -ErrorAction SilentlyContinue | ForEach-Object InstallLocation | Where-Object { $_ -and (Test-Path (Join-Path $_ 'pwsh.exe')) } | Select-Object -First 1)"`) do (
        set "PWSH_EXE=%%i\pwsh.exe"
    )
)

if not defined PWSH_EXE if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "PWSH_EXE=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not defined PWSH_EXE if exist "%ProgramFiles(x86)%\PowerShell\7\pwsh.exe" set "PWSH_EXE=%ProgramFiles(x86)%\PowerShell\7\pwsh.exe"
if not defined PWSH_EXE if exist "%LOCALAPPDATA%\Microsoft\PowerShell\7\pwsh.exe" set "PWSH_EXE=%LOCALAPPDATA%\Microsoft\PowerShell\7\pwsh.exe"

REM Then try PATH, skipping WindowsApps alias
if not defined PWSH_EXE (
    for /f "usebackq delims=" %%i in (`where pwsh 2^>nul`) do (
        set "CAND=%%i"
        echo Found pwsh candidate on PATH: !CAND! >> "%WRAP_LOG%"
        echo !CAND! | find /i "\WindowsApps\pwsh.exe" >nul
        if errorlevel 1 (
            set "PWSH_EXE=!CAND!"
            goto :validate_pwsh
        ) else (
            echo Skipping WindowsApps Store alias: !CAND! >> "%WRAP_LOG%"
        )
    )
)

:validate_pwsh
if defined PWSH_EXE (
    "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "exit" 1>nul 2>&1
    if errorlevel 1 (
        echo pwsh candidate failed to execute, falling back: %PWSH_EXE% >> "%WRAP_LOG%"
        set "PWSH_EXE="
    )
)

if not defined PWSH_EXE goto :found_pwsh
:found_pwsh
if defined PWSH_EXE (
    echo Using PowerShell 7+: %PWSH_EXE%
    echo Using PowerShell 7+: %PWSH_EXE% >> "%WRAP_LOG%"
    "%PWSH_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "& { & '%SCRIPT_DIR%DOCKER.ps1' -Install -Silent -NoShortcut; exit $LASTEXITCODE }" 1>>"%WRAP_LOG%" 2>&1
    set "EXITCODE=%ERRORLEVEL%"
) else (
    echo PowerShell 7 not found, using Windows PowerShell...
    echo PowerShell 7 not found, using Windows PowerShell... >> "%WRAP_LOG%"
    echo Note: Some features may require PowerShell 7+ >> "%WRAP_LOG%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& { & '%SCRIPT_DIR%DOCKER.ps1' -Install -Silent -NoShortcut; exit $LASTEXITCODE }" 1>>"%WRAP_LOG%" 2>&1
    set "EXITCODE=%ERRORLEVEL%"
)

:checkresult
echo Exit code: %EXITCODE% >> "%WRAP_LOG%"
if NOT "%EXITCODE%" == "0" (
    echo.
    echo Installation encountered an error. Please check DOCKER_INSTALL.log at:
    echo     %SCRIPT_DIR%DOCKER_INSTALL.log
    echo You may need to install Docker Desktop and ensure it is running.
    echo.
    echo --- Log tail ---
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%SCRIPT_DIR%DOCKER_INSTALL.log' -Tail 40" 2>nul
    echo ----------------
    echo.
    pause
    endlocal & exit /b %EXITCODE%
)

echo.
echo Docker installation and runtime image preparation completed successfully!
echo SMS runtime images are ready. Run DOCKER.ps1 -Start when you want to launch.
echo.
endlocal & exit /b 0
