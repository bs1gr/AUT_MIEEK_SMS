# ============================================================================
#   Student Management System - Quick Start
#   Minimal automation to run the app with sane defaults
# ============================================================================

param(
    [ValidateSet('native', 'docker', 'fullstack')]
    [string]$Mode = 'native',
    [switch]$ControlOnly,
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
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1 [options]"
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor Yellow
    Write-Host "  -Mode native      (default) Start native Python backend + Vite frontend"
    Write-Host "  -Mode docker      Start via docker-compose (2 containers with NGINX)"
    Write-Host "  -Mode fullstack   Start single Docker container (backend serves SPA)"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -ControlOnly      (native mode only) Start backend + control panel, no frontend"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1                    # Start native (backend+frontend)"
    Write-Host "  .\QUICKSTART.ps1 -ControlOnly       # Start backend with control panel only"
    Write-Host "  .\QUICKSTART.ps1 -Mode docker       # Start via docker-compose"
    Write-Host "  .\QUICKSTART.ps1 -Mode fullstack    # Start single fullstack container"
    Write-Host ""
    Write-Host "For troubleshooting, diagnostics, and utilities, run:" -ForegroundColor Cyan
    Write-Host "  .\UTILITIES.ps1"
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
    Write-Host "  Mode: $Mode" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    switch ($Mode) {
        'native' {
            if ($ControlOnly) {
                Write-Info "Starting in control panel mode (lightweight)..."
                & ".\scripts\RUN.ps1" -ControlOnly
            } else {
                Write-Info "Starting native backend + frontend..."
                & ".\scripts\RUN.ps1"
            }
        }
        'docker' {
            Write-Info "Starting via docker-compose (NGINX proxy + backend)..."
            & ".\scripts\DOCKER_UP.ps1"
        }
        'fullstack' {
            Write-Info "Starting fullstack Docker container (single container)..."
            & ".\scripts\DOCKER_FULLSTACK_UP.ps1"
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Start failed with exit code $LASTEXITCODE"
        Write-Warn "Run .\UTILITIES.ps1 for diagnostics and troubleshooting."
        exit $LASTEXITCODE
    }

    Write-Ok "Started successfully!"
    Write-Host ""
} finally {
    Pop-Location
}
