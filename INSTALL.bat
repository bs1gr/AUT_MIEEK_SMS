@echo off
REM Wrapper script - calls the actual installation script
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\INSTALL.ps1"
