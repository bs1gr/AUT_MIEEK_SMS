#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Student Management System - One-Click Launcher
.DESCRIPTION
    Intelligent launcher that auto-detects system state and performs the right action:
    - First time: Runs complete installation
    - Ready: Starts the application
    - Broken: Offers diagnostics and repair
.PARAMETER ForceInstall
    Force reinstallation even if already installed
.PARAMETER PreferDocker
    Prefer Docker mode over native development mode
.PARAMETER PreferNative
    Prefer native development mode over Docker
.PARAMETER SkipStart
    Setup only, don't start the application
.PARAMETER Verbose
    Show detailed output
.EXAMPLE
    .\ONE-CLICK.ps1
    # Auto-detects and runs appropriate action
.EXAMPLE
    .\ONE-CLICK.ps1 -ForceInstall
    # Forces complete reinstallation
#>

param(
    [switch]$ForceInstall,
    [switch]$PreferDocker,
    [switch]$PreferNative,
    [switch]$SkipStart,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

# Console colors
function Write-Step { param($msg) Write-Host "`n✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Title { param($msg) Write-Host "`n$('='*60)" -ForegroundColor Magenta; Write-Host $msg -ForegroundColor Magenta; Write-Host "$('='*60)" -ForegroundColor Magenta }

# Logo
function Show-Logo {
    Write-Host @"

    ╔═══════════════════════════════════════════════════╗
    ║                                                   ║
    ║   🎓 STUDENT MANAGEMENT SYSTEM - ONE CLICK 🎓     ║
    ║                                                   ║
    ║   Intelligent Launcher v1.2.0                     ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan
}

# Check if system is installed
function Test-Installation {
    $checks = @{
        BackendDeps = Test-Path "$PROJECT_ROOT\backend\venv"
        FrontendDeps = Test-Path "$PROJECT_ROOT\frontend\node_modules"
        Database = Test-Path "$PROJECT_ROOT\data\student_management.db"
        EnvFiles = (Test-Path "$PROJECT_ROOT\backend\.env") -and (Test-Path "$PROJECT_ROOT\frontend\.env")
    }
    
    $installed = $checks.Values -notcontains $false
    return @{
        Installed = $installed
        Checks = $checks
    }
}

# Check if services are running
function Test-ServicesRunning {
    $backendRunning = $false
    $frontendRunning = $false
    $dockerRunning = $false
    
    # Check backend (port 8000)
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        $backendRunning = $response.StatusCode -eq 200
    } catch {}
    
    # Check frontend (port 5173)
    try {
        $conn = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        $frontendRunning = $conn.TcpTestSucceeded
    } catch {}
    
    # Check Docker container
    try {
        $container = docker ps --filter "name=sms-fullstack" --format "{{.Names}}" 2>$null
        $dockerRunning = $container -eq "sms-fullstack"
    } catch {}
    
    return @{
        Backend = $backendRunning
        Frontend = $frontendRunning
        Docker = $dockerRunning
        AnyRunning = $backendRunning -or $frontendRunning -or $dockerRunning
    }
}

# Check prerequisites
function Test-Prerequisites {
    $python = $null
    $node = $null
    $docker = $null
    
    # Python
    try {
        $pythonOutput = python --version 2>&1
        if ($pythonOutput -match "Python (\d+\.\d+)") {
            $pythonVer = [Version]$matches[1]
            if ($pythonVer -ge [Version]"3.11") {
                $python = $pythonOutput
            }
        }
    } catch {}
    
    # Node.js
    try {
        $nodeOutput = node --version 2>&1
        if ($nodeOutput -match "v(\d+)\.") {
            $nodeVer = [int]$matches[1]
            if ($nodeVer -ge 18) {
                $node = $nodeOutput
            }
        }
    } catch {}
    
    # Docker
    try {
        $dockerOutput = docker --version 2>&1
        if ($dockerOutput -match "Docker version") {
            $docker = $dockerOutput
        }
    } catch {}
    
    return @{
        Python = $python
        Node = $node
        Docker = $docker
    }
}

# Run installation
function Invoke-Installation {
    Write-Title "🚀 RUNNING INSTALLATION"
    
    $prereqs = Test-Prerequisites
    
    # Check what we have
    if (-not $prereqs.Python) {
        Write-Fail "Python 3.11+ is required but not found"
        Write-Info "Please install Python from: https://www.python.org/downloads/"
        return $false
    }
    
    if (-not $prereqs.Node) {
        Write-Fail "Node.js 18+ is required but not found"
        Write-Info "Please install Node.js from: https://nodejs.org/"
        return $false
    }
    
    Write-Step "Prerequisites OK: Python ✅ Node.js ✅"
    if ($prereqs.Docker) {
        Write-Info "Docker detected: $($prereqs.Docker)"
    }
    
    # Run smart setup
    Write-Info "Launching intelligent setup..."
    
    $setupArgs = @()
    if ($PreferDocker) { $setupArgs += "-PreferDocker" }
    if ($PreferNative) { $setupArgs += "-PreferNative" }
    if ($SkipStart) { $setupArgs += "-SkipStart" }
    if ($Verbose) { $setupArgs += "-Verbose" }
    
    $setupScript = Join-Path $PROJECT_ROOT "QUICKSTART.ps1"
    
    if ($setupArgs.Count -gt 0) {
        & $setupScript @setupArgs
    } else {
        & $setupScript
    }
    
    return $LASTEXITCODE -eq 0
}

# Start services
function Start-Services {
    Write-Title "▶️  STARTING SERVICES"
    
    # Check if Docker is available and preferred
    $prereqs = Test-Prerequisites
    $useDocker = $false
    
    if ($prereqs.Docker -and (-not $PreferNative)) {
        Write-Info "Docker available - checking for existing setup..."
        
        if (Test-Path "$PROJECT_ROOT\docker-compose.yml") {
            $useDocker = $true
        }
    }
    
    if ($useDocker) {
        Write-Step "Starting in Docker mode..."
        Push-Location $PROJECT_ROOT
        try {
            docker-compose up -d
            if ($LASTEXITCODE -eq 0) {
                Write-Step "Application started successfully!"
                Write-Info "Access at: http://localhost:8080"
                Write-Info "Control Panel: http://localhost:8080/control"
                return $true
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Step "Starting in native development mode..."
        
        # Use SMS.ps1 to start
        $smsScript = Join-Path $PROJECT_ROOT "SMS.ps1"
        if (Test-Path $smsScript) {
            Write-Info "Using SMS.ps1 management script..."
            & $smsScript -Start
            return $LASTEXITCODE -eq 0
        } else {
            Write-Warn "SMS.ps1 not found - using direct startup..."
            
            # Start backend
            Write-Info "Starting backend..."
            Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PROJECT_ROOT\backend'; python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
            
            Start-Sleep -Seconds 3
            
            # Start frontend
            Write-Info "Starting frontend..."
            Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PROJECT_ROOT\frontend'; npm run dev"
            
            Write-Step "Application started successfully!"
            Write-Info "Backend: http://localhost:8000"
            Write-Info "Frontend: http://localhost:5173"
            Write-Info "Control Panel: http://localhost:8000/control"
            return $true
        }
    }
    
    return $false
}

# Show status
function Show-Status {
    $status = Test-ServicesRunning
    
    Write-Title "📊 SYSTEM STATUS"
    
    Write-Host ""
    if ($status.Docker) {
        Write-Host "  🐳 Docker Container: " -NoNewline
        Write-Host "RUNNING" -ForegroundColor Green
        Write-Host "     Access: http://localhost:8080"
        Write-Host "     Control: http://localhost:8080/control"
    } elseif ($status.Backend -or $status.Frontend) {
        Write-Host "  🔧 Native Development Mode:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "     Backend:  " -NoNewline
        if ($status.Backend) {
            Write-Host "RUNNING" -ForegroundColor Green -NoNewline
            Write-Host " (http://localhost:8000)"
        } else {
            Write-Host "STOPPED" -ForegroundColor Red
        }
        Write-Host "     Frontend: " -NoNewline
        if ($status.Frontend) {
            Write-Host "RUNNING" -ForegroundColor Green -NoNewline
            Write-Host " (http://localhost:5173)"
        } else {
            Write-Host "STOPPED" -ForegroundColor Red
        }
        if ($status.Backend) {
            Write-Host "     Control:  http://localhost:8000/control"
        }
    } else {
        Write-Host "  ⭕ All services: " -NoNewline
        Write-Host "STOPPED" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Interactive menu
function Show-Menu {
    Write-Title "🎯 WHAT WOULD YOU LIKE TO DO?"
    Write-Host ""
    Write-Host "  1. 🚀 Start Application"
    Write-Host "  2. 🛑 Stop Application"
    Write-Host "  3. 📊 Show Status"
    Write-Host "  4. 🔍 Run Diagnostics"
    Write-Host "  5. 🔄 Reinstall/Repair"
    Write-Host "  6. 🧹 Cleanup (Logs, Temp Files)"
    Write-Host "  7. 📖 Open Documentation"
    Write-Host "  8. ❌ Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1-8)"
    return $choice
}

# Main execution
function Main {
    Show-Logo
    
    # Check if force install requested
    if ($ForceInstall) {
        Write-Info "Force installation requested..."
        $success = Invoke-Installation
        if (-not $success) {
            Write-Fail "Installation failed"
            exit 1
        }
        if (-not $SkipStart) {
            Start-Services
        }
        return
    }
    
    # Auto-detect system state
    $installation = Test-Installation
    $services = Test-ServicesRunning
    
    Write-Info "Analyzing system state..."
    Start-Sleep -Milliseconds 500
    
    # Decision tree
    if (-not $installation.Installed) {
        # Not installed - run installation
        Write-Warn "System not installed - running first-time setup..."
        $success = Invoke-Installation
        if (-not $success) {
            Write-Fail "Installation failed"
            exit 1
        }
        return
    } elseif ($services.AnyRunning) {
        # Already running - show status
        Write-Step "System already running!"
        Show-Status
        Write-Host ""
        Write-Host "Press any key to open interactive menu..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        
        # Show menu
        while ($true) {
            $choice = Show-Menu
            switch ($choice) {
                "1" { Start-Services }
                "2" { & "$PROJECT_ROOT\SMS.ps1" -Stop }
                "3" { Show-Status }
                "4" { & "$PROJECT_ROOT\SMS.ps1" -Diagnostics }
                "5" { Invoke-Installation }
                "6" { & "$PROJECT_ROOT\scripts\internal\CLEANUP.ps1" }
                "7" { Start-Process "http://localhost:8000/docs" }
                "8" { exit 0 }
                default { Write-Warn "Invalid choice. Please enter 1-8." }
            }
            Write-Host ""
            Write-Host "Press any key to continue..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    } else {
        # Installed but not running - start it
        Write-Step "System installed - starting application..."
        $success = Start-Services
        if (-not $success) {
            Write-Fail "Failed to start application"
            Write-Info "Run diagnostics with: .\SMS.ps1 -Diagnostics"
            exit 1
        }
    }
}

# Run
try {
    Main
} catch {
    Write-Fail "An error occurred: $_"
    Write-Info "For help, run: .\SMS.ps1 -Help"
    exit 1
}
