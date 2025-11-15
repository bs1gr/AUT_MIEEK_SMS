@echo off
REM First Time Setup - Student Management System
REM Builds fullstack Docker image

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP.ps1" %*
