@echo off
REM SMS Docker Launcher - Reliable Docker container management
REM This launcher handles both start and stop operations without PowerShell issues

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Determine action from command line or default to start
set ACTION=%1
if "%ACTION%"=="" set ACTION=start

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker Desktop is not installed or not running.
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Get version from VERSION file
set VERSION=
for /f "tokens=*" %%a in (VERSION) do (
    set "VERSION=%%a"
)
if "!VERSION!"=="" set VERSION=latest

REM Container and image names
set IMAGE_NAME=sms-fullstack:!VERSION!
set CONTAINER_NAME=sms-app
set VOLUME_NAME=sms_data

REM Log directory
if not exist logs mkdir logs
set LOGFILE=logs\launcher.log
echo [%date% %time%] Starting action: %ACTION% >> "!LOGFILE!"

if /i "%ACTION%"=="start" goto :start
if /i "%ACTION%"=="stop" goto :stop
if /i "%ACTION%"=="restart" goto :restart
if /i "%ACTION%"=="status" goto :status
if /i "%ACTION%"=="build" goto :build
goto :usage

:start
echo Checking Docker image...
docker inspect !IMAGE_NAME! >nul 2>&1
if errorlevel 1 (
    echo Docker image not found. Building SMS application...
    call :build
    if errorlevel 1 exit /b 1
)

echo Checking for running container...
docker inspect !CONTAINER_NAME! >nul 2>&1
if errorlevel 1 (
    echo Container doesn't exist, creating new one...
    goto :create_container
)

docker inspect !CONTAINER_NAME! --format="{{ .State.Running }}" | findstr "true" >nul 2>&1
if errorlevel 1 (
    echo Container exists but is stopped, starting it...
    docker start !CONTAINER_NAME!
    if errorlevel 1 (
        echo Failed to start container
        exit /b 1
    )
) else (
    echo Container is already running
)

echo.
echo ============================================
echo SMS Application is running!
echo ============================================
echo Access at: http://localhost:8080
echo.
echo [%date% %time%] Start action completed successfully >> "!LOGFILE!"
exit /b 0

:create_container
echo Creating Docker volume...
docker volume create !VOLUME_NAME! 2>nul

echo Starting container...
docker run -d ^
  --name !CONTAINER_NAME! ^
  -p 8080:8000 ^
  -v !VOLUME_NAME!:/data ^
  -e VERSION=!VERSION! ^
  !IMAGE_NAME!

if errorlevel 1 (
    echo Failed to create and start container
    echo [%date% %time%] Failed to create container >> "!LOGFILE!"
    exit /b 1
)

echo.
echo ============================================
echo SMS Application started successfully!
echo ============================================
echo Access at: http://localhost:8080
echo.
echo [%date% %time%] Container created and started >> "!LOGFILE!"
exit /b 0

:stop
echo Checking if container is running...
docker inspect !CONTAINER_NAME! >nul 2>&1
if errorlevel 1 (
    echo Container is not running
    exit /b 0
)

echo Stopping SMS application...
docker stop !CONTAINER_NAME!
if errorlevel 1 (
    echo Failed to stop container
    exit /b 1
)

echo SMS application stopped
echo [%date% %time%] Stop action completed >> "!LOGFILE!"
exit /b 0

:restart
echo Restarting SMS application...
call :stop
if errorlevel 1 exit /b 1
timeout /t 2 /nobreak
call :start
exit /b 0

:status
echo Checking SMS application status...
docker inspect !CONTAINER_NAME! >nul 2>&1
if errorlevel 1 (
    echo Status: Container does not exist
    exit /b 1
)

docker inspect !CONTAINER_NAME! --format="{{ .State.Running }}" | findstr "true" >nul 2>&1
if errorlevel 1 (
    echo Status: Stopped
) else (
    echo Status: Running
    echo Access at: http://localhost:8080
)
exit /b 0

:build
echo Building SMS Docker image (this may take several minutes)...
echo [%date% %time%] Starting Docker build >> "!LOGFILE!"

docker build -t !IMAGE_NAME! -f docker/Dockerfile.fullstack .
if errorlevel 1 (
    echo Build failed!
    echo [%date% %time%] Docker build failed >> "!LOGFILE!"
    exit /b 1
)

echo Image built successfully: !IMAGE_NAME!
echo [%date% %time%] Docker build completed >> "!LOGFILE!"
exit /b 0

:usage
echo.
echo SMS Docker Launcher
echo Usage: %~nx0 [action]
echo.
echo Actions:
echo   start   - Start the SMS application (default)
echo   stop    - Stop the SMS application
echo   restart - Restart the SMS application
echo   status  - Check application status
echo   build   - Build Docker image
echo.
exit /b 1

:end
endlocal
