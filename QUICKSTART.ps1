# ============================================================================
#   Student Management System - Quick Start
#   Runs the fullstack Docker container (build via UTILITIES if needed)
# ============================================================================

param(
    [int]$Port = 8080,
    [switch]$Rebuild,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)   { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host $msg -ForegroundColor Red }

function Show-Help {
    Write-Host ""
    Write-Host "QUICKSTART - Student Management System" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Runs the fullstack Docker container (backend serves SPA)." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1 [options]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Port <number>    Host port to expose (default: 8080)"
    Write-Host "  -Rebuild          Rebuild the Docker image before running"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1              # Start fullstack on port 8080"
    Write-Host "  .\QUICKSTART.ps1 -Rebuild     # Rebuild and start"
    Write-Host "  .\QUICKSTART.ps1 -Port 9000   # Start on custom port"
    Write-Host ""
    Write-Host "Prerequisites:" -ForegroundColor Cyan
    Write-Host "  - Docker Desktop installed and running"
    Write-Host "  - Fullstack image built (run UTILITIES.ps1 → Install to build)"
    Write-Host ""
    Write-Host "For troubleshooting, diagnostics, and utilities, run:" -ForegroundColor Cyan
    Write-Host "  .\UTILITIES.ps1"
    Write-Host ""
    Write-Host "To stop the container:" -ForegroundColor Cyan
    Write-Host "  .\scripts\DOCKER_FULLSTACK_DOWN.ps1"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

Push-Location $PSScriptRoot
try {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - Quick Start" -ForegroundColor Cyan
    Write-Host "  Fullstack Docker Container" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Build args for DOCKER_FULLSTACK_UP.ps1
    $scriptArgs = @()
    if ($Rebuild) {
        $scriptArgs += '-Rebuild'
    }
    if ($Port -ne 8080) {
        $scriptArgs += '-Port', $Port
    }

    Write-Info "Starting fullstack container on http://localhost:$Port ..."
    & ".\scripts\DOCKER_FULLSTACK_UP.ps1" @scriptArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Start failed with exit code $LASTEXITCODE"
        Write-Warn "Run .\UTILITIES.ps1 for diagnostics and troubleshooting."
        exit $LASTEXITCODE
    }

    Write-Ok "Started successfully!"
    Write-Host ""
    Write-Info "Access the app at: http://localhost:$Port"
    Write-Host ""
} finally {
    Pop-Location
}
