@echo off
setlocal enabledelayedexpansion

REM Student Management System - Full Cleanup (non-destructive)
REM - Stops containers/services
REM - Clears caches and temp artifacts
REM - Preserves data (SQLite DB, Docker volumes)

set ROOT=%~dp0
cd /d "%ROOT%"

echo ===============================================
echo  SMS - FULL CLEANUP (non-destructive)
echo ===============================================

REM Timestamp via WMIC (YYYYMMDDhhmmss)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>NUL') do set LDT=%%I
if not defined LDT set LDT=00000000000000
set TS=%LDT:~0,8%_%LDT:~8,6%

REM Backup native database if present
if exist "data\student_management.db" (
  set BKDIR=backups\%TS%\native
  if not exist "%BKDIR%" mkdir "%BKDIR%"
  echo Backing up native DB to "%BKDIR%\student_management.db" ...
  copy /y "data\student_management.db" "%BKDIR%\student_management.db" >NUL
)

REM Stop Docker services (ignore errors if not present)
echo Stopping Docker compose services (if any)...
docker compose down --remove-orphans 2>NUL 1>NUL

REM Stop legacy single-container (if used previously)
for /f "delims=" %%C in ('docker ps -q --filter "name=sms-fullstack"') do (
  echo Stopping legacy container sms-fullstack...
  docker stop sms-fullstack 1>NUL 2>NUL
)

REM Remove Python caches
echo Cleaning Python caches ...
for /d /r %%d in (__pycache__) do (
  rd /s /q "%%d" 2>NUL
)
if exist backend\.pytest_cache rd /s /q backend\.pytest_cache
if exist .pytest_cache rd /s /q .pytest_cache

REM Clear backend logs (preserve folder)
if exist backend\logs (
  echo Clearing backend logs ...
  del /q backend\logs\*.* 2>NUL
)

REM Frontend build artifacts (keep node_modules; uninstall script will remove)
if exist frontend\dist (
  echo Removing frontend build folder (dist) ...
  rd /s /q frontend\dist 2>NUL
)

REM Compose override artifacts (optional)
if exist docker-compose.override.yml (
  echo Keeping docker-compose.override.yml (user-specific overrides).
)

echo.
echo Cleanup complete. Data and volumes preserved.
echo Backups: .\backups\%TS%\native (if DB existed)

endlocal
exit /b 0
