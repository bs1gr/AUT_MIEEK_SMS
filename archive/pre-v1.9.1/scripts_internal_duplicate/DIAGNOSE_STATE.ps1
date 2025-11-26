#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Diagnoses the Student Management System deployment state and provides actionable guidance.

.DESCRIPTION
    Checks if the app is running natively (host processes), in Docker containers, or not running.
    Provides clear guidance on how to start, stop, restart, and manage the application.

.EXAMPLE
    .\DIAGNOSE_STATE.ps1
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# Color output functions
function Write-Header { param($Text) Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host $Text -ForegroundColor Cyan; Write-Host "========================================`n" -ForegroundColor Cyan }
function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠ $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ $Text" -ForegroundColor Blue }
function Write-Action { param($Text) Write-Host "→ $Text" -ForegroundColor Magenta }

# Navigate to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Header "STUDENT MANAGEMENT SYSTEM - STATE DIAGNOSIS"

# ============================================
# 1. CHECK DOCKER AVAILABILITY
# ============================================
Write-Host "`n[1/6] Checking Docker availability..." -ForegroundColor Yellow

$dockerAvailable = $false
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerAvailable = $true
        Write-Success "Docker is installed: $dockerVersion"

        # Check if Docker daemon is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker daemon is running"
        } else {
            Write-Warning2 "Docker is installed but daemon is not running"
            Write-Info "Start Docker Desktop to use containerized mode"
            $dockerAvailable = $false
        }
    }
} catch {
    Write-Warning2 "Docker is not installed or not in PATH"
}

# ============================================
# 2. CHECK DOCKER COMPOSE
# ============================================
if ($dockerAvailable) {
    Write-Host "`n[2/6] Checking Docker Compose..." -ForegroundColor Yellow

    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose is available: $composeVersion"
        } else {
            Write-Warning2 "Docker Compose not available (using legacy docker-compose?)"
        }
    } catch {
        Write-Warning2 "Docker Compose check failed"
    }
}

# ============================================
# 3. CHECK DOCKER CONTAINERS
# ============================================
$containersRunning = @()
$containersStopped = @()

if ($dockerAvailable) {
    Write-Host "`n[3/6] Checking Docker containers..." -ForegroundColor Yellow

    try {
        # Check for SMS-related containers (both naming patterns)
        $allContainers = docker ps -a --format "{{.Names}}|{{.State}}|{{.Status}}" 2>&1 |
            Where-Object { $_ -match "student-management|sms" }

        if ($LASTEXITCODE -eq 0 -and $allContainers) {
            foreach ($line in $allContainers) {
                $parts = $line -split '\|'
                if ($parts.Length -ge 2) {
                    $name = $parts[0]
                    $state = $parts[1]

                    if ($state -eq "running") {
                        $containersRunning += $name
                        Write-Success "Container running: $name"
                    } else {
                        $containersStopped += $name
                        Write-Warning2 "Container stopped: $name ($state)"
                    }
                }
            }

            if ($containersRunning.Count -eq 0 -and $containersStopped.Count -eq 0) {
                Write-Info "No SMS containers found"
            }
        } else {
            Write-Info "No SMS containers found"
        }
    } catch {
        Write-Warning2 "Could not check Docker containers: $_"
    }
}

# ============================================
# 4. CHECK NATIVE PROCESSES (HOST)
# ============================================
Write-Host "`n[4/6] Checking native host processes..." -ForegroundColor Yellow

$backendProcess = $null
$frontendProcess = $null

# Check for Python/Uvicorn backend on port 8000
try {
    $backendPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue 2>$null
    if ($backendPort) {
        $backendPid = $backendPort.OwningProcess
        $backendProcess = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
        if ($backendProcess) {
            Write-Success "Backend process found: $($backendProcess.ProcessName) (PID: $backendPid, Port: 8000)"
        }
    } else {
        Write-Info "No process listening on port 8000 (backend)"
    }
} catch {
    Write-Info "No backend process detected on port 8000"
}

# Check for Node/Vite frontend on port 5173
try {
    $frontendPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue 2>$null
    if ($frontendPort) {
        $frontendPid = $frontendPort.OwningProcess
        $frontendProcess = Get-Process -Id $frontendPid -ErrorAction SilentlyContinue
        if ($frontendProcess) {
            Write-Success "Frontend process found: $($frontendProcess.ProcessName) (PID: $frontendPid, Port: 5173)"
        }
    } else {
        Write-Info "No process listening on port 5173 (frontend)"
    }
} catch {
    Write-Info "No frontend process detected on port 5173"
}

# ============================================
# 5. CHECK ENVIRONMENT FILES
# ============================================
Write-Host "`n[5/6] Checking environment and configuration..." -ForegroundColor Yellow

if (Test-Path "docker/docker-compose.yml") {
    Write-Success "docker/docker-compose.yml found"
} else {
    Write-Error2 "docker/docker-compose.yml NOT found"
}

if (Test-Path "docker-compose.override.yml") {
    Write-Success "docker-compose.override.yml found (custom volume configuration active)"
} else {
    Write-Info "docker-compose.override.yml not found (using default volume)"
}

if (Test-Path "backend/requirements.txt") {
    Write-Success "backend/requirements.txt found"
} else {
    Write-Error2 "backend/requirements.txt NOT found"
}

if (Test-Path "frontend/package.json") {
    Write-Success "frontend/package.json found"
} else {
    Write-Error2 "frontend/package.json NOT found"
}

# Check for venv
if (Test-Path "backend/venv") {
    Write-Success "Python virtual environment found (backend/venv)"
} else {
    Write-Info "No Python virtual environment found (backend/venv)"
}

# Check for node_modules
if (Test-Path "frontend/node_modules") {
    Write-Success "Node modules installed (frontend/node_modules)"
} else {
    Write-Info "Node modules not installed (frontend/node_modules)"
}

# ============================================
# 6. DETERMINE DEPLOYMENT STATE
# ============================================
Write-Host "`n[6/6] Determining deployment state..." -ForegroundColor Yellow

$deploymentState = "UNKNOWN"
$isRunning = $false

if ($containersRunning.Count -gt 0) {
    # Check if it's compose or fullstack
    $isCompose = $containersRunning | Where-Object { $_ -match "student-management-system" }
    $isFullstack = $containersRunning | Where-Object { $_ -match "sms-fullstack" }

    if ($isCompose) {
        # Check if we also have stopped compose containers
        $stoppedCompose = $containersStopped | Where-Object { $_ -match "student-management-system" }
        if ($stoppedCompose) {
            $deploymentState = "DOCKER_COMPOSE_PARTIAL"
            Write-Warning2 "Deployment: DOCKER COMPOSE (Partially Running - some services down)"
            $isRunning = $true
        } else {
            $deploymentState = "DOCKER_COMPOSE"
            Write-Success "Deployment: DOCKER COMPOSE (All services running)"
            $isRunning = $true
        }
    } elseif ($isFullstack) {
        $deploymentState = "DOCKER_CONTAINERIZED"
        Write-Success "Deployment: DOCKER FULLSTACK CONTAINER (Running)"
        $isRunning = $true
    } else {
        $deploymentState = "DOCKER_CONTAINERIZED"
        Write-Success "Deployment: DOCKER CONTAINERS (Running)"
        $isRunning = $true
    }
} elseif ($containersStopped.Count -gt 0) {
    # Check if compose containers exist (even if stopped)
    $isCompose = $containersStopped | Where-Object { $_ -match "student-management-system" }
    if ($isCompose) {
        # Check if any compose containers are running
        $runningCompose = $containersRunning | Where-Object { $_ -match "student-management-system" }
        if ($runningCompose) {
            $deploymentState = "DOCKER_COMPOSE_PARTIAL"
            Write-Warning2 "Deployment: DOCKER COMPOSE (Partially Running)"
            $isRunning = $true
        } else {
            $deploymentState = "DOCKER_COMPOSE_STOPPED"
            Write-Warning2 "Deployment: DOCKER COMPOSE (Stopped)"
            $isRunning = $false
        }
    } else {
        $deploymentState = "DOCKER_CONTAINERIZED_STOPPED"
        Write-Warning2 "Deployment: DOCKER CONTAINERS (Stopped)"
        $isRunning = $false
    }
} elseif ($backendProcess -or $frontendProcess) {
    $deploymentState = "NATIVE_HOST"
    $isRunning = $true
    Write-Success "Deployment: NATIVE HOST PROCESSES (Running)"
} else {
    $deploymentState = "NOT_RUNNING"
    $isRunning = $false
    Write-Info "Deployment: NOT RUNNING"
}

# ============================================
# SUMMARY & RECOMMENDATIONS
# ============================================
Write-Header "SUMMARY & RECOMMENDATIONS"

Write-Host "Current State: " -NoNewline
switch ($deploymentState) {
    "DOCKER_COMPOSE" { Write-Host "RUNNING IN DOCKER COMPOSE" -ForegroundColor Green }
    "DOCKER_COMPOSE_PARTIAL" { Write-Host "DOCKER COMPOSE (SOME SERVICES DOWN)" -ForegroundColor Yellow }
    "DOCKER_COMPOSE_STOPPED" { Write-Host "DOCKER COMPOSE EXISTS BUT STOPPED" -ForegroundColor Yellow }
    "DOCKER_CONTAINERIZED" { Write-Host "RUNNING IN DOCKER CONTAINERS" -ForegroundColor Green }
    "DOCKER_CONTAINERIZED_STOPPED" { Write-Host "DOCKER CONTAINERS EXIST BUT STOPPED" -ForegroundColor Yellow }
    "NATIVE_HOST" { Write-Host "RUNNING NATIVELY ON HOST" -ForegroundColor Green }
    "NOT_RUNNING" { Write-Host "NOT RUNNING" -ForegroundColor Red }
    default { Write-Host "UNKNOWN" -ForegroundColor Gray }
}

Write-Host "`n" -NoNewline

# ============================================
# ACTIONABLE GUIDANCE
# ============================================
switch ($deploymentState) {
    "DOCKER_CONTAINERIZED" {
        Write-Header "HOW TO MANAGE (Docker Fullstack - Running)"

        Write-Action "View logs (fullstack container):"
        Write-Host "  .\DOCKER.ps1 -Logs" -ForegroundColor White
        Write-Host "  docker compose logs -f            # Legacy compose (deprecated)" -ForegroundColor Gray
        Write-Host "  docker compose logs backend -f    # Legacy compose (deprecated)" -ForegroundColor Gray
        Write-Host "  docker compose logs frontend -f   # Legacy compose (deprecated)" -ForegroundColor Gray

        Write-Action "`nRestart / rebuild:"
        Write-Host "  .\DOCKER.ps1 -Update       # Rebuild (cache) + restart" -ForegroundColor White
        Write-Host "  .\DOCKER.ps1 -UpdateClean  # Rebuild w/o cache" -ForegroundColor White
        Write-Host "  .\DOCKER.ps1 -Start        # Start if stopped" -ForegroundColor White
        Write-Host "  docker compose restart          # Legacy compose" -ForegroundColor Gray

        Write-Action "`nStop services:"
        Write-Host "  .\DOCKER.ps1 -Stop" -ForegroundColor White
        Write-Host "  docker compose stop             # Legacy compose" -ForegroundColor Gray

        Write-Action "`nRemove all (deep clean):"
        Write-Host "  .\DOCKER.ps1 -DeepClean" -ForegroundColor White
        Write-Host "  docker compose down              # Legacy compose" -ForegroundColor Gray

        Write-Action "`nAccess application (single container):"
        Write-Host "  Application (SPA + API): http://localhost:8080" -ForegroundColor White
        Write-Host "  API Docs (Swagger):     http://localhost:8080/docs" -ForegroundColor White
        Write-Host "  Health Check:           http://localhost:8080/health" -ForegroundColor White
    }

    "DOCKER_CONTAINERIZED_STOPPED" {
        Write-Header "HOW TO MANAGE (Docker Fullstack - Stopped)"

        Write-Action "Start container:"
        Write-Host "  .\DOCKER.ps1 -Start" -ForegroundColor White
        Write-Host "  docker compose start          # Legacy compose" -ForegroundColor Gray
        Write-Host "  docker compose up -d          # Legacy compose" -ForegroundColor Gray

        Write-Action "`nFull rebuild:"
        Write-Host "  .\DOCKER.ps1 -UpdateClean" -ForegroundColor White
        Write-Host "  docker compose down              # Legacy compose" -ForegroundColor Gray
        Write-Host "  docker compose up -d --build     # Legacy compose" -ForegroundColor Gray

        Write-Action "`nStatus:"
        Write-Host "  .\DOCKER.ps1 -Status" -ForegroundColor White
        Write-Host "  docker compose ps                # Legacy compose" -ForegroundColor Gray
    }

    "NATIVE_HOST" {
        Write-Header "HOW TO MANAGE (Native Mode - Running)"

        Write-Action "Stop services:"
        Write-Host "  Press Ctrl+C in each terminal" -ForegroundColor White
        Write-Host "  OR: .\NATIVE.ps1 -Stop" -ForegroundColor White

        Write-Action "`nRestart services:"
        Write-Host "  1. Stop (Ctrl+C or .\NATIVE.ps1 -Stop)" -ForegroundColor White
        Write-Host "  2. Start: .\NATIVE.ps1 -Start" -ForegroundColor White
        Write-Host "     (First time: .\NATIVE.ps1 -Setup)" -ForegroundColor Gray

        Write-Action "`nView process details:"
        if ($backendProcess) { Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor White }
        if ($frontendProcess) { Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor White }

        Write-Action "`nSwitch to Docker mode:"
        Write-Host "  1. Stop native: .\NATIVE.ps1 -Stop" -ForegroundColor White
        Write-Host "  2. Start fullstack: .\DOCKER.ps1 -Start" -ForegroundColor White
        Write-Host "     (Advanced legacy compose: docker compose up -d --build)" -ForegroundColor Gray
    }

    "NOT_RUNNING" {
        Write-Header "HOW TO START THE APPLICATION"

        if ($dockerAvailable) {
            Write-Host "RECOMMENDED: Docker Fullstack (Ενιαίος Container)" -ForegroundColor Cyan
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

            Write-Action "Quick Start (Docker):"
            Write-Host "  .\DOCKER.ps1 -Install   # Πρώτη φορά (build + init DB)" -ForegroundColor White
            Write-Host "  .\DOCKER.ps1 -Start     # Εκκίνηση / επανεκκίνηση" -ForegroundColor White
            Write-Host "  .\DOCKER.ps1 -Update    # Γρήγορο rebuild" -ForegroundColor White
            Write-Host "  docker compose up -d --build   # Legacy compose (deprecated)" -ForegroundColor Gray

            Write-Action "`nAccess after starting:"
            Write-Host "  Application: http://localhost:8080" -ForegroundColor White
            Write-Host "  API Docs:    http://localhost:8080/docs" -ForegroundColor White
            Write-Host "`n"
        }

        Write-Host "ALTERNATIVE: Native Development (Χωριστά Backend/Frontend)" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

        Write-Action "Prerequisites:"
        Write-Host "  - Python 3.11+ installed" -ForegroundColor White
        Write-Host "  - Node.js 18+ installed" -ForegroundColor White

        Write-Action "`nQuick Start (Native):"
        Write-Host "  .\NATIVE.ps1 -Setup   # Πρώτη φορά" -ForegroundColor White
        Write-Host "  .\NATIVE.ps1 -Start   # Εκκίνηση" -ForegroundColor White
        Write-Host "  .\NATIVE.ps1 -Stop    # Διακοπή" -ForegroundColor White
        Write-Host "  .\SMART_SETUP.ps1     # Έξυπνη αυτόματη εγκατάσταση" -ForegroundColor Gray

        if (-not $dockerAvailable) {
            Write-Host "`n"
            Write-Warning2 "Docker is not available. Native host mode is your only option."
            Write-Info "Install Docker Desktop to enable containerized deployment."
        }
    }
}

# ============================================
# ADDITIONAL TOOLS
# ============================================
Write-Header "ADDITIONAL MANAGEMENT TOOLS"

Write-Action "Diagnostic & Cleanup:"
Write-Host "  .\scripts\DEBUG_PORTS.ps1           # Check what's using ports 8000/5173" -ForegroundColor White
Write-Host "  .\scripts\DIAGNOSE_FRONTEND.ps1     # Diagnose frontend issues" -ForegroundColor White
Write-Host "  .\scripts\CLEANUP.ps1               # Clean build artifacts" -ForegroundColor White

Write-Action "`nDocker-specific tools:"
if ($dockerAvailable) {
    Write-Host "  .\scripts\docker\DOCKER_REFRESH.ps1        # Rebuild and restart containers" -ForegroundColor White
    Write-Host "  .\scripts\docker\DOCKER_DOWN.ps1           # Stop and remove containers" -ForegroundColor White
    Write-Host "  .\scripts\docker\DOCKER_SMOKE.ps1          # Quick health check" -ForegroundColor White
    Write-Host "  .\scripts\docker\DOCKER_UPDATE_VOLUME.ps1  # Migrate to new data volume" -ForegroundColor White
} else {
    Write-Host "  (Docker not available)" -ForegroundColor Gray
}

Write-Action "`nDevelopment tools:"
Write-Host "  .\scripts\DEVTOOLS.ps1              # Backup / restore / sample data (uses DOCKER.ps1 & NATIVE.ps1)" -ForegroundColor White

# ============================================
# PORT CONFLICTS
# ============================================
Write-Host "`n"
Write-Info "If you see port conflict errors, run: .\scripts\DEBUG_PORTS.ps1"
Write-Info "For detailed documentation, see: docs/QUICKREF.md"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnosis complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Return status code
if ($isRunning) {
    exit 0
} else {
    exit 1
}
