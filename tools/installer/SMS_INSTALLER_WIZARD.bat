@echo off
REM DEPRECATED: use scripts\utils\installer\SMS_INSTALLER_WIZARD.bat
set TARGET=%~dp0..\..\scripts\utils\installer\SMS_INSTALLER_WIZARD.bat
echo [DEPRECATED] Redirecting to %TARGET%
call "%TARGET%" %*
