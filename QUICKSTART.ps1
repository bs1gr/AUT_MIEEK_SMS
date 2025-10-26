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
    Write-Host "  - Fullstack image built (automatic setup on first run)"
    Write-Host ""
    Write-Host "Automatic Recovery:" -ForegroundColor Cyan
    Write-Host "  If fullstack fails → Runs SETUP automatically"
    Write-Host "  If SETUP fails → Shows DEVTOOLS instructions"
    Write-Host ""
    Write-Host "Manual Tools:" -ForegroundColor Cyan
    Write-Host "  .\scripts\SETUP.ps1       - Build Docker image from scratch"
    Write-Host "  .\scripts\DEVTOOLS.ps1    - Diagnostics and troubleshooting"
    Write-Host "  .\scripts\STOP.ps1        - Stop all containers"
    Write-Host ""
    Write-Host "To stop the container:" -ForegroundColor Cyan
    Write-Host "  docker stop sms-fullstack"
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
        Write-Err "Failed to start fullstack container (exit code $LASTEXITCODE)"
        Write-Host ""
        Write-Warn "Possible causes:"
        Write-Host "  - Docker image not built yet"
        Write-Host "  - Docker Desktop not running"
        Write-Host "  - Port $Port already in use"
        Write-Host ""
        Write-Info "Attempting automatic recovery..."
        Write-Host ""
        
        # Check if Docker is running
        try {
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Docker is not running!"
                Write-Host ""
                Write-Warn "Please start Docker Desktop and try again."
                Write-Host ""
                exit 1
            }
        } catch {
            Write-Err "Docker is not available!"
            Write-Host ""
            Write-Warn "Please install/start Docker Desktop and try again."
            Write-Host ""
            exit 1
        }
        
        # Check if image exists
        $imageExists = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String -Pattern "sms-fullstack:latest" -Quiet
        
        if (-not $imageExists) {
            Write-Warn "Docker image 'sms-fullstack' not found."
            Write-Info "Running SETUP to build the image..."
            Write-Host ""
            
            if (Test-Path ".\scripts\SETUP.ps1") {
                & ".\scripts\SETUP.ps1"
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Ok "Setup completed! Retrying QUICKSTART..."
                    Write-Host ""
                    & ".\scripts\DOCKER_FULLSTACK_UP.ps1" @scriptArgs
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Ok "Started successfully after setup!"
                        Write-Host ""
                        Write-Info "Access the app at: http://localhost:$Port"
                        Write-Host ""
                        exit 0
                    }
                }
                
                Write-Err "Setup failed or container still won't start."
            } else {
                Write-Err "SETUP script not found at .\scripts\SETUP.ps1"
            }
        } else {
            Write-Warn "Docker image exists but container failed to start."
            Write-Host ""
            Write-Info "Possible port conflict. Checking for running containers..."
            docker ps --filter "publish=$Port" --format "table {{.Names}}\t{{.Ports}}"
        }
        
        Write-Host ""
        Write-Warn "For manual diagnostics and troubleshooting, run:"
        Write-Info "  .\scripts\DEVTOOLS.ps1"
        Write-Host ""
        Write-Warn "Or check the documentation:"
        Write-Info "  README.md - General usage"
        Write-Info "  DOCKER.md - Docker-specific help"
        Write-Host ""
        exit 1
    }

    Write-Ok "Started successfully!"
    Write-Host ""
    Write-Info "Access the app at: http://localhost:$Port"
    Write-Host ""
} finally {
    Pop-Location
}
