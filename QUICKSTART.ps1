<#
.SYNOPSIS
    Student Management System - Quick Start Launcher

.DESCRIPTION
    Intelligent quick start that:
    - Detects first-time vs existing installation
    - Automatically installs missing dependencies
    - Chooses optimal deployment mode (Docker/Native)
    - Starts the application

.EXAMPLE
    .\QUICKSTART.ps1
    Auto-detect and start the application

.EXAMPLE
    .\QUICKSTART.ps1 -Help
    Show help and available options

.NOTES
    This now uses SMART_SETUP.ps1 for intelligent setup and deployment.
    For manual control, use: .\SMS.ps1
#>

param(
    [switch]$Help,
    [switch]$Force,       # Force reinstall dependencies
    [switch]$NoBrowser    # Do not auto-open the application in a browser
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
    Write-Host "  .\QUICKSTART.ps1              Auto-setup and start (intelligent mode)"
    Write-Host "  .\QUICKSTART.ps1 -Force       Reinstall everything and start"
    Write-Host "  .\QUICKSTART.ps1 -NoBrowser   Don't auto-open browser after start"
    Write-Host "  .\QUICKSTART.ps1 -Help    Show this help message"
    Write-Host ""
    Write-Host "WHAT THIS DOES:" -ForegroundColor Yellow
    Write-Host "  • Detects if this is first-time installation"
    Write-Host "  • Checks for Python, Node.js, and Docker"
    Write-Host "  • Installs missing dependencies automatically"
    Write-Host "  • Chooses best deployment mode (Docker/Native)"
    Write-Host "  • Initializes database if needed"
    Write-Host "  • Starts the application"
    Write-Host ""
    Write-Host "OTHER TOOLS:" -ForegroundColor Yellow
    Write-Host "  .\SMS.ps1                - Manual management interface"
    Write-Host "  .\SMART_SETUP.ps1        - Advanced setup with options"
    Write-Host "  .\scripts\STOP.ps1       - Stop all services"
    Write-Host ""
    Write-Host "TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "  If setup fails, check 'setup.log' in the project root."
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
    
    function Wait-And-OpenBrowser {
        param(
            [switch]$NoBrowser
        )
        if ($NoBrowser) { return }

        # Try to detect which port becomes available (Docker: 8080, Native: 5173)
        $targets = @(
            @{ Url = 'http://localhost:8080'; Name = 'Docker Frontend (8080)' },
            @{ Url = 'http://localhost:5173'; Name = 'Native Frontend (5173)' }
        )

        $deadline = (Get-Date).AddSeconds(120)
        $opened = $false
        while ((Get-Date) -lt $deadline -and -not $opened) {
            foreach ($t in $targets) {
                try {
                    $resp = Invoke-WebRequest -Uri $t.Url -Method GET -UseBasicParsing -TimeoutSec 3 2>$null
                    if ($resp -and $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                        Write-Host "Opening $($t.Url) ..." -ForegroundColor Cyan
                        try { Start-Process $t.Url } catch {}
                        $opened = $true
                        break
                    }
                } catch {
                    # Not ready yet
                }
            }
            if (-not $opened) { Start-Sleep -Seconds 2 }
        }

        if (-not $opened) {
            Write-Host "Application started. Could not detect frontend readiness automatically." -ForegroundColor Yellow
            Write-Host "Try opening: http://localhost:8080 or http://localhost:5173" -ForegroundColor Gray
        }
    }

    # Use SMART_SETUP for intelligent setup and start
    if (Test-Path ".\SMART_SETUP.ps1") {
        if ($Force) { & ".\SMART_SETUP.ps1" -Force } else { & ".\SMART_SETUP.ps1" }
        $exit = $LASTEXITCODE
        # On successful start, try to open browser automatically (unless suppressed)
        if ($exit -eq 0) { Wait-And-OpenBrowser -NoBrowser:$NoBrowser }
        exit $exit
    } else {
        Write-Host "ERROR: SMART_SETUP.ps1 not found!" -ForegroundColor Red
        Write-Host "Please ensure SMART_SETUP.ps1 exists in the project root directory." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}
