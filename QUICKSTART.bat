@echo off
REM Quick Start - Student Management System
REM Wrapper for QUICKSTART.ps1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0QUICKSTART.ps1" %*
