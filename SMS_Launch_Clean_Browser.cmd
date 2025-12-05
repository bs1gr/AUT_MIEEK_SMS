@echo off
REM SMS Clean Browser Launcher - Clears cache and opens fresh interface
REM Starts Docker container, clears browser cache, then opens browser in incognito mode

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Start the SMS application
call SMS_Launcher.cmd start

REM Wait a few seconds for container to be ready
timeout /t 5 /nobreak >nul

REM Clear Chrome cache by removing the cache directory
REM (This works for Chrome on Windows; Edge uses similar paths)
set "CHROME_CACHE=%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache"
set "EDGE_CACHE=%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache"

if exist "%CHROME_CACHE%" (
    echo Clearing Chrome cache...
    rmdir /s /q "%CHROME_CACHE%" 2>nul
)

if exist "%EDGE_CACHE%" (
    echo Clearing Edge cache...
    rmdir /s /q "%EDGE_CACHE%" 2>nul
)

REM Open browser in private/incognito mode to bypass any remaining cache
REM Try Chrome first (most common)
for %%G in (chrome.exe, msedge.exe, firefox.exe) do (
    where %%G >nul 2>nul
    if not errorlevel 1 (
        if "%%G"=="chrome.exe" (
            start chrome.exe --incognito "http://localhost:8080"
            exit /b 0
        ) else if "%%G"=="msedge.exe" (
            start msedge.exe --inprivate "http://localhost:8080"
            exit /b 0
        ) else if "%%G"=="firefox.exe" (
            start firefox.exe -private-window "http://localhost:8080"
            exit /b 0
        )
    )
)

REM Fallback: just open normally
start http://localhost:8080

exit /b 0
