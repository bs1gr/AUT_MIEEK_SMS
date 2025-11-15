@echo off
REM Stop Application - Student Management System
REM Stops the fullstack Docker container

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP.ps1" %*
