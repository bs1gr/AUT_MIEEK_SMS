@echo off
setlocal enabledelayedexpansion

REM Student Management System - Full Uninstall (preserve data)
REM - Runs CLEANUP (non-destructive)
REM - Removes developer environments (venv, node_modules)
REM - Removes project Docker images (keeps volumes by default)
REM - Backs up native DB first via CLEANUP

set ROOT=%~dp0
cd /d "%ROOT%"

echo ========================================
echo    Student Management System
echo            UNINSTALLER
echo ========================================

REM 1) Run non-destructive cleanup first
call "%ROOT%\CLEANUP.bat"

REM 2) Remove Python virtual environment (backend)
if exist backend\venv (
  echo Removing Python virtual environment (backend\venv) ...
  rd /s /q backend\venv 2>NUL
) else (
  echo backend\venv not found (skipping)
)

REM 3) Remove frontend node_modules and lock files
if exist frontend\node_modules (
  echo Removing frontend node_modules ...
  rd /s /q frontend\node_modules 2>NUL
) else (
  echo frontend\node_modules not found (skipping)
)
if exist frontend\package-lock.json del /q frontend\package-lock.json
if exist frontend\pnpm-lock.yaml del /q frontend\pnpm-lock.yaml
if exist frontend\yarn.lock del /q frontend\yarn.lock

REM 4) Remove project Docker images (keep volumes)
echo Removing project Docker images (keeping volumes) ...
docker image rm -f sms-backend:latest 1>NUL 2>NUL
docker image rm -f sms-frontend:latest 1>NUL 2>NUL
REM Legacy single image (if used previously)
docker image rm -f sms-fullstack:latest 1>NUL 2>NUL

REM 5) Done

echo.
echo Uninstall complete.
echo - Native database backups are in .\backups
echo - Docker volumes (e.g., sms_data) are preserved.
echo   To remove data volume manually (CAUTION: data loss):
echo     docker volume rm sms_data

echo.
endlocal
exit /b 0
