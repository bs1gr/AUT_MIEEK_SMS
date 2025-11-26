# ============================================================================
#   Student Management System - Stop Application
#   Stops and removes the fullstack Docker container
# ============================================================================

param(
    [switch]$RemoveImage,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)   { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host $msg -ForegroundColor Yellow }

function Show-Help {
    Write-Host ""
    Write-Host "STOP - Student Management System" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Stops the fullstack Docker container." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\STOP.ps1 [options]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -RemoveImage    Also remove the Docker image (free up space)"
    Write-Host "  -Help           Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\STOP.ps1                  # Stop container only"
    Write-Host "  .\STOP.ps1 -RemoveImage     # Stop and remove image"
    Write-Host ""
}

if ($Help) {
    Write-Host "WARNING: This script is deprecated. Use .\\SMS.ps1 -Stop instead." -ForegroundColor Yellow
    Show-Help
    exit 0
}

Push-Location $PSScriptRoot
try {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - Stop" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    $scriptArgs = @()
    if ($RemoveImage) {
        $scriptArgs += '-RemoveImage'
    }

    Write-Info "Stopping fullstack container..."
    $downScript = Join-Path $PSScriptRoot 'DOCKER_FULLSTACK_DOWN.ps1'

    if (-not (Test-Path $downScript)) {
        Write-Warn "DOCKER_FULLSTACK_DOWN.ps1 not found at: $downScript"
        Write-Info "Attempting 'docker compose down'..."
        try {
            docker compose down
        } catch {
            Write-Warn "'docker compose' not available or failed. Trying legacy 'docker-compose'..."
            docker-compose down
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Docker stop failed (exit code: $LASTEXITCODE)"
            exit $LASTEXITCODE
        }
    } else {
        & $downScript @scriptArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Stop completed with warnings (exit code: $LASTEXITCODE)"
            exit $LASTEXITCODE
        }
    }

    Write-Ok "Stopped successfully!"
    Write-Host ""
} finally {
    Pop-Location
}
