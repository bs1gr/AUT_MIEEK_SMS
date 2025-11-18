#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Minimal cross-platform script to start/stop the Student Management System containers.

.DESCRIPTION
    Checks if Docker containers are running and starts them if stopped, or stops them if running.
    Works on Windows (PowerShell), macOS, and Linux.

.EXAMPLE
    .\OnOff.ps1
    Toggles the container state (start if stopped, stop if running)
#>

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Yellow }

# Check if Docker is installed and running
function Test-Docker {
    try {
        $null = docker info 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# Check if containers are running
function Test-ContainersRunning {
    try {
        $running = docker-compose ps --services --filter "status=running" 2>&1
        if ($LASTEXITCODE -eq 0 -and $running) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Main logic
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Student Management System - Container Toggle (OnOff)    " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Docker availability
Write-Info "Checking Docker availability..."
if (-not (Test-Docker)) {
    Write-Error "❌ Docker is not running or not installed!"
    Write-Warning "Please start Docker Desktop and try again."
    exit 1
}
Write-Success "✓ Docker is running"
Write-Host ""

# Check container status
Write-Info "Checking container status..."
$isRunning = Test-ContainersRunning

if ($isRunning) {
    Write-Warning "⚠ Containers are currently RUNNING"
    Write-Host ""
    $response = Read-Host "Do you want to STOP the containers? (y/N)"

    if ($response -match '^[Yy]') {
        Write-Info "Stopping containers..."
        docker-compose down

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "✓ Containers stopped successfully!"
        }
        else {
            Write-Error "❌ Failed to stop containers"
            exit 1
        }
    }
    else {
        Write-Info "Operation cancelled. Containers remain running."
    }
}
else {
    Write-Success "✓ Containers are currently STOPPED"
    Write-Host ""
    $response = Read-Host "Do you want to START the containers? (Y/n)"

    if ($response -notmatch '^[Nn]') {
        Write-Info "Starting containers..."
        docker-compose up -d

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "✓ Containers started successfully!"
            Write-Host ""
            Write-Info "Access the application at:"
            Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
            Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Yellow
        }
        else {
            Write-Error "❌ Failed to start containers"
            exit 1
        }
    }
    else {
        Write-Info "Operation cancelled. Containers remain stopped."
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
