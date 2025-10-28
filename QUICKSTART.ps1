<#
.SYNOPSIS
    Student Management System - Quick Start Launcher

.DESCRIPTION
    Simple launcher that starts the application using the new unified SMS.ps1 interface.
    This script provides a minimal entry point that delegates to SMS.ps1.

.EXAMPLE
    .\QUICKSTART.ps1
    Quick start the application in auto mode

.EXAMPLE
    .\QUICKSTART.ps1 -Help
    Show help and available options

.NOTES
    For advanced management, use: .\SMS.ps1
    For full diagnostics, use: .\scripts\internal\DIAGNOSE_STATE.ps1
#>

param(
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  STUDENT MANAGEMENT SYSTEM - Quick Start                      ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1          Start the application (auto-detects best mode)"
    Write-Host "  .\QUICKSTART.ps1 -Help    Show this help message"
    Write-Host ""
    Write-Host "WHAT THIS DOES:" -ForegroundColor Yellow
    Write-Host "  • Automatically detects if Docker is available"
    Write-Host "  • Starts the app in the best available mode"
    Write-Host "  • Opens your browser to the application"
    Write-Host ""
    # ACCESS URLS removed; user can check status for URLs if needed
    Write-Host "OTHER TOOLS:" -ForegroundColor Yellow
    Write-Host "  .\SMS.ps1                              - Full management interface (menu-driven)"
    Write-Host "  .\scripts\internal\DIAGNOSE_STATE.ps1  - Comprehensive diagnostics"
    Write-Host "  .\scripts\STOP.ps1                     - Stop all services"
    Write-Host ""
    Write-Host "FIRST TIME SETUP:" -ForegroundColor Yellow
    Write-Host "  If this is your first time, just run: .\QUICKSTART.ps1"
    Write-Host "  The script will automatically set up everything needed."
    Write-Host ""
    exit 0
}

Push-Location $PSScriptRoot
try {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  STUDENT MANAGEMENT SYSTEM - Quick Start                      ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Starting application..." -ForegroundColor Cyan
    Write-Host ""
    
    # Delegate to SMS.ps1 with Quick flag
    if (Test-Path ".\SMS.ps1") {
        & ".\SMS.ps1" -Quick
        exit $LASTEXITCODE
    } else {
        Write-Host "ERROR: SMS.ps1 not found!" -ForegroundColor Red
        Write-Host "Please ensure SMS.ps1 exists in the project root directory." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}
