@echo off
REM Quick Start - Student Management System
REM Wrapper for QUICKSTART.ps1 with pwsh preference

setlocal

REM Prefer PowerShell 7+ (pwsh) if available
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
	pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0QUICKSTART.ps1" %*
) else (
	REM Fallback to Windows PowerShell
	powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0QUICKSTART.ps1" %*
)

endlocal
