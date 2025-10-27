# ============================================================================
#   Student Management System - Quick Start
#   Intelligently starts the app in the best available mode
# ============================================================================

param(
    [ValidateSet('auto', 'docker', 'native', 'fullstack')]
    [string]$Mode = 'auto',
    [switch]$Help,
    [switch]$Force
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
    Write-Host "Intelligently starts the app in the best available mode." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1 [options]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Mode <mode>      Deployment mode: auto|docker|native|fullstack (default: auto)"
    Write-Host "  -Force            Stop conflicting processes/containers before starting"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor Yellow
    Write-Host "  auto              Detect and use the best available mode (recommended)"
    Write-Host "  docker            Use Docker Compose (backend + frontend containers)"
    Write-Host "  native            Run natively on host (Python + Node.js)"
    Write-Host "  fullstack         Use fullstack container (single container)"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\QUICKSTART.ps1                    # Auto-detect best mode"
    Write-Host "  .\QUICKSTART.ps1 -Mode docker       # Force Docker Compose"
    Write-Host "  .\QUICKSTART.ps1 -Mode native       # Force native"
    Write-Host "  .\QUICKSTART.ps1 -Force             # Stop conflicts automatically"
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "  Docker/Fullstack: http://localhost:8080"
    Write-Host "  Native:           http://localhost:5173"
    Write-Host ""
    Write-Host "Management:" -ForegroundColor Cyan
    Write-Host "  .\scripts\DIAGNOSE_STATE.ps1    - Check current state"
    Write-Host "  .\scripts\STOP.ps1              - Stop everything"
    Write-Host "  docs\STATE_MANAGEMENT_GUIDE.md  - Complete guide"
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
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Detect current state
    $dockerAvailable = $false
    $dockerRunning = $false
    $composeExists = Test-Path "docker-compose.yml"
    $nativeReady = (Test-Path "backend/venv") -and (Test-Path "frontend/node_modules")
    
    # Check Docker
    try {
        docker info 2>&1 | Out-Null
        $dockerAvailable = ($LASTEXITCODE -eq 0)
        $dockerRunning = $dockerAvailable
    } catch {
        $dockerAvailable = $false
    }

    # Check what's currently running
    $composeContainers = @()
    if ($dockerAvailable) {
        try {
            $output = docker compose ps --services --filter "status=running" 2>$null
            if ($output) {
                $composeContainers = @($output)
            }
        } catch {
            $composeContainers = @()
        }
    }
    
    # Determine mode
    $selectedMode = $Mode
    if ($Mode -eq 'auto') {
        Write-Info "Detecting best available mode..."
        Write-Host ""
        
        if ($composeContainers -and $composeContainers.Count -gt 0) {
            $selectedMode = 'docker'
            Write-Ok "Found running Docker Compose containers"
        } elseif ($dockerRunning -and $composeExists) {
            $selectedMode = 'docker'
            Write-Ok "Docker is available with compose configuration"
        } elseif ($nativeReady) {
            $selectedMode = 'native'
            Write-Ok "Native environment is ready (venv + node_modules)"
        } elseif ($dockerRunning) {
            $selectedMode = 'docker'
            Write-Ok "Docker is available (will use compose mode)"
        } else {
            $selectedMode = 'native'
            Write-Warn "No Docker available, will attempt native mode"
        }
        
        Write-Info "Selected mode: $selectedMode"
        Write-Host ""
    }
    
    # Handle conflicts if Force is specified
    if ($Force) {
        Write-Info "Stopping any conflicting processes/containers..."
        & ".\scripts\STOP.ps1" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Start in selected mode
    switch ($selectedMode) {
        'docker' {
            if (-not $dockerRunning) {
                Write-Err "Docker mode requested but Docker is not running!"
                Write-Warn "Please start Docker Desktop and try again."
                Write-Host ""
                exit 1
            }
            
            if (-not $composeExists) {
                Write-Err "Docker Compose mode requested but docker-compose.yml not found!"
                Write-Host ""
                exit 1
            }
            
            Write-Info "Starting Docker Compose services..."
            Write-Host ""
            
            docker compose up -d --build
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Ok "✓ Services started successfully!"
                Write-Host ""
                Write-Info "Access your application at:"
                Write-Host "  → Frontend: " -NoNewline
                Write-Host "http://localhost:8080" -ForegroundColor White
                Write-Host "  → API Docs: " -NoNewline
                Write-Host "http://localhost:8080/api/docs" -ForegroundColor White
                Write-Host ""
                Write-Info "View logs: docker compose logs -f"
                Write-Info "Stop: docker compose stop"
                Write-Host ""
                exit 0
            } else {
                Write-Err "Failed to start Docker Compose services!"
                Write-Host ""
                Write-Warn "Run diagnostics: .\scripts\DIAGNOSE_STATE.ps1"
                exit 1
            }
        }
        
        'native' {
            Write-Info "Starting in native mode (Python + Node.js)..."
            Write-Host ""
            
            # Check prerequisites
            if (-not (Test-Path "backend/venv")) {
                Write-Warn "Python virtual environment not found. Running setup..."
                Write-Host ""
                
                if (Test-Path ".\scripts\SETUP.ps1") {
                    & ".\scripts\SETUP.ps1"
                    if ($LASTEXITCODE -ne 0) {
                        Write-Err "Setup failed!"
                        exit 1
                    }
                } else {
                    Write-Err "Setup script not found!"
                    exit 1
                }
            }
            
            if (-not (Test-Path "frontend/node_modules")) {
                Write-Warn "Node modules not found. Running setup..."
                Write-Host ""
                
                if (Test-Path ".\scripts\SETUP.ps1") {
                    & ".\scripts\SETUP.ps1"
                    if ($LASTEXITCODE -ne 0) {
                        Write-Err "Setup failed!"
                        exit 1
                    }
                } else {
                    Write-Err "Setup script not found!"
                    exit 1
                }
            }
            
            # Start native
            if (Test-Path ".\scripts\RUN.ps1") {
                & ".\scripts\RUN.ps1"
                exit $LASTEXITCODE
            } else {
                Write-Err "RUN script not found at .\scripts\RUN.ps1"
                exit 1
            }
        }
        
        'fullstack' {
            if (-not $dockerRunning) {
                Write-Err "Fullstack mode requested but Docker is not running!"
                Write-Warn "Please start Docker Desktop and try again."
                Write-Host ""
                exit 1
            }
            
            Write-Info "Starting fullstack container..."
            Write-Host ""
            
            if (Test-Path ".\scripts\DOCKER_FULLSTACK_UP.ps1") {
                & ".\scripts\DOCKER_FULLSTACK_UP.ps1"
                exit $LASTEXITCODE
            } else {
                Write-Err "DOCKER_FULLSTACK_UP script not found!"
                exit 1
            }
        }
        
        default {
            Write-Err "Unknown mode: $selectedMode"
            Write-Host ""
            Write-Info "Valid modes: auto, docker, native, fullstack"
            Write-Info "Run with -Help for more information"
            Write-Host ""
            exit 1
        }
    }
    
} finally {
    Pop-Location
}
