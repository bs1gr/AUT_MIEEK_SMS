@echo off
REM Utilities & Troubleshooting - Student Management System
REM Wrapper for UTILITIES.ps1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0UTILITIES.ps1" %*
