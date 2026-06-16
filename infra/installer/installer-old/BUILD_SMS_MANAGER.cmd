@echo off
REM Build and publish SMS_Manager.exe for Windows x64
REM This creates a self-contained, trimmed executable with no external dependencies

REM Store current directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%SMS_Manager"
set "OUTPUT_DIR=%SCRIPT_DIR%dist"

REM Check if .NET SDK is installed
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: .NET SDK is not installed or not in PATH
    echo Please install .NET 6.0 or later from https://dotnet.microsoft.com/download
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building SMS_Manager.exe
echo ========================================
echo.

REM Clean previous build
if exist "%PROJECT_DIR%\bin\" (
    echo Cleaning previous build artifacts...
    rmdir /s /q "%PROJECT_DIR%\bin" >nul 2>&1
)

if exist "%PROJECT_DIR%\obj\" (
    rmdir /s /q "%PROJECT_DIR%\obj" >nul 2>&1
)

REM Restore dependencies
echo Restoring dependencies...
cd /d "%PROJECT_DIR%"
dotnet restore

REM Build and publish as single-file executable
echo.
echo Publishing as self-contained executable...
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true

if errorlevel 1 (
    echo.
    echo ERROR: Build failed
    pause
    exit /b 1
)

REM Copy to dist folder (if publish didn't already do it)
if exist "%PROJECT_DIR%\bin\Release\net6.0-windows\win-x64\publish\SMS_Manager.exe" (
    echo.
    echo Copying SMS_Manager.exe to dist folder...
    copy "%PROJECT_DIR%\bin\Release\net6.0-windows\win-x64\publish\SMS_Manager.exe" "%OUTPUT_DIR%\SMS_Manager.exe"
)

echo.
echo ========================================
echo  Build Complete
echo ========================================
echo.
echo Output: %OUTPUT_DIR%\SMS_Manager.exe
echo.
echo You can now include SMS_Manager.exe in the SMS Installer.
echo Size:
for /f %%a in ('dir /-1 "%OUTPUT_DIR%\SMS_Manager.exe" ^| find "SMS_Manager.exe"') do echo    %%~za bytes
echo.
pause
