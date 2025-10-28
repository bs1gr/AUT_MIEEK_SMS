#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Student Management System - Unified Management Interface

.DESCRIPTION
    Interactive menu-driven interface for all SMS operations:
    - Start/Stop/Restart application
    - Docker and native mode support
    - Database management (backup/restore)
    - Diagnostics and troubleshooting
    - System maintenance

.EXAMPLE
    .\SMS.ps1
    
.EXAMPLE
    .\SMS.ps1 -Quick
    Quick start the application (Docker if available, else native)
    
.EXAMPLE
    .\SMS.ps1 -Status
    Show current system status
#>

param(
    [switch]$Quick,      # Quick start
    [switch]$Status,     # Show status and exit
    [switch]$Stop,       # Stop all services
    [switch]$Help        # Show help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# Navigate to project root
$scriptDir = $PSScriptRoot
Set-Location $scriptDir

# Read version
$version = "unknown"
if (Test-Path "VERSION") {
    $version = (Get-Content "VERSION" -Raw).Trim()
}

# ============================================================================
#  UTILITY FUNCTIONS
# ============================================================================

function Write-Header { 
    param($Text, $Color = 'Cyan') 
    Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor $Color
    Write-Host ("  {0,-66}" -f $Text) -ForegroundColor $Color
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor $Color
}

function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠ $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ $Text" -ForegroundColor Blue }
function Write-Action { param($Text) Write-Host "→ $Text" -ForegroundColor Magenta }

function Pause-Safe {
    Write-Host ""
    try {
        Read-Host "Press ENTER to continue" | Out-Null
    } catch {
        Start-Sleep -Seconds 1
    }
}

function Test-DockerRunning {
    try {
        $null = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-Port {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue 2>$null
        return $null -ne $conn
    } catch {
        return $false
    }
}

# ============================================================================
#  SYSTEM STATUS DETECTION
# ============================================================================

function Get-SystemStatus {
    $status = @{
        Docker = @{
            Installed = $false
            Running = $false
            Containers = @()
        }
        Native = @{
            BackendRunning = $false
            BackendPID = $null
            FrontendRunning = $false
            FrontendPID = $null
        }
        State = 'NOT_RUNNING'
        Message = ''
    }
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $status.Docker.Installed = $true
            
            # Check if daemon is running
            $dockerInfo = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $status.Docker.Running = $true
                
                # Check for SMS containers
                $containers = @(docker ps --format "{{.Names}}|{{.State}}" 2>&1 | 
                    Where-Object { $_ -match "student-management|sms" })
                
                foreach ($line in $containers) {
                    if ($line) {
                        $parts = $line -split '\|'
                        if ($parts.Length -ge 2) {
                            $status.Docker.Containers += @{
                                Name = $parts[0]
                                State = $parts[1]
                            }
                        }
                    }
                }
            }
        }
    } catch {}
    
    # Check native processes
    if (Test-Port 8000) {
        $backendPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
        if ($backendPort) {
            $status.Native.BackendRunning = $true
            $status.Native.BackendPID = $backendPort.OwningProcess
        }
    }
    
    if (Test-Port 5173) {
        $frontendPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
        if ($frontendPort) {
            $status.Native.FrontendRunning = $true
            $status.Native.FrontendPID = $frontendPort.OwningProcess
        }
    }
    
    # Determine state
    $runningContainers = @($status.Docker.Containers | Where-Object { $_.State -eq 'running' })
    
    if ($runningContainers.Count -gt 0) {
        $status.State = 'DOCKER'
        $status.Message = "Running in Docker ($($runningContainers.Count) container(s))"
    } elseif ($status.Native.BackendRunning -or $status.Native.FrontendRunning) {
        $status.State = 'NATIVE'
        $status.Message = "Running natively on host"
    } elseif ($status.Docker.Containers -and $status.Docker.Containers.Count -gt 0) {
        $status.State = 'DOCKER_STOPPED'
        $status.Message = "Docker containers exist but stopped"
    } else {
        $status.State = 'NOT_RUNNING'
        $status.Message = "Not running"
    }
    
    return $status
}

function Show-SystemStatus {
    param([switch]$Detailed)
    
    $status = Get-SystemStatus
    
    Write-Header "SYSTEM STATUS"
    
    Write-Host "`nApplication State: " -NoNewline
    switch ($status.State) {
        'DOCKER' { Write-Host $status.Message -ForegroundColor Green }
        'NATIVE' { Write-Host $status.Message -ForegroundColor Green }
        'DOCKER_STOPPED' { Write-Host $status.Message -ForegroundColor Yellow }
        'NOT_RUNNING' { Write-Host $status.Message -ForegroundColor Red }
    }
    
    Write-Host "`nDocker:" -ForegroundColor Yellow
    if ($status.Docker.Installed) {
        Write-Success "Installed"
        if ($status.Docker.Running) {
            Write-Success "Daemon running"
            if ($status.Docker.Containers -and $status.Docker.Containers.Count -gt 0) {
                Write-Host "  Containers:" -ForegroundColor Gray
                foreach ($c in $status.Docker.Containers) {
                    $color = if ($c.State -eq 'running') { 'Green' } else { 'Yellow' }
                    Write-Host "    • $($c.Name) [$($c.State)]" -ForegroundColor $color
                }
            } else {
                Write-Info "No SMS containers found"
            }
        } else {
            Write-Warning2 "Daemon not running"
        }
    } else {
        Write-Info "Not installed"
    }
    
    Write-Host "`nNative Processes:" -ForegroundColor Yellow
    if ($status.Native.BackendRunning) {
        Write-Success "Backend running (PID: $($status.Native.BackendPID), Port: 8000)"
    } else {
        Write-Info "Backend not running"
    }
    
    if ($status.Native.FrontendRunning) {
        Write-Success "Frontend running (PID: $($status.Native.FrontendPID), Port: 5173)"
    } else {
        Write-Info "Frontend not running"
    }
    
    # Show access URLs if running
    if ($status.State -in @('DOCKER', 'NATIVE')) {
        Write-Host "`nAccess URLs:" -ForegroundColor Yellow
        if ($status.State -eq 'DOCKER') {
            Write-Host "  Frontend:      http://localhost:8080" -ForegroundColor Cyan
            Write-Host "  Backend API:   http://localhost:8080/docs" -ForegroundColor Cyan
            Write-Host "  Control Panel: http://localhost:8080/control" -ForegroundColor Cyan
        } else {
            Write-Host "  Frontend:      http://localhost:5173" -ForegroundColor Cyan
            Write-Host "  Backend API:   http://localhost:8000/docs" -ForegroundColor Cyan
            Write-Host "  Control Panel: http://localhost:5173/control" -ForegroundColor Cyan
        }
    }
    
    if ($Detailed) {
        Write-Host "`nEnvironment:" -ForegroundColor Yellow
        if (Test-Path "backend/venv") { Write-Success "Python venv exists" } else { Write-Info "Python venv not found" }
        if (Test-Path "frontend/node_modules") { Write-Success "Node modules installed" } else { Write-Info "Node modules not installed" }
        if (Test-Path "data/student_management.db") { 
            $dbSize = [math]::Round((Get-Item "data/student_management.db").Length / 1KB, 2)
            Write-Success "Database exists ($dbSize KB)"
        } else { 
            Write-Info "Database not found (will be created on first run)" 
        }
    }
    
    Write-Host ""
    
    return $status
}

# ============================================================================
#  APPLICATION CONTROL
# ============================================================================

function Start-Application {
    param([string]$Mode = 'auto')
    
    $status = Get-SystemStatus
    
    # Check if already running
    if ($status.State -in @('DOCKER', 'NATIVE')) {
        Write-Warning2 "Application is already running!"
        Write-Host "State: $($status.Message)" -ForegroundColor Yellow
        Write-Host ""
        $choice = Read-Host "Restart? (y/N)"
        if ($choice -notmatch '^y') {
            return
        }
        Stop-Application -Force
        Start-Sleep -Seconds 2
    }
    
    # Determine mode
    if ($Mode -eq 'auto') {
        if ($status.Docker.Installed -and $status.Docker.Running) {
            $Mode = 'docker'
            Write-Info "Auto-selected Docker mode (Docker is available)"
        } else {
            $Mode = 'native'
            Write-Info "Auto-selected native mode (Docker not available)"
        }
    }
    
    Write-Header "STARTING APPLICATION - $($Mode.ToUpper()) MODE"
    
    if ($Mode -eq 'docker') {
        if (-not $status.Docker.Running) {
            Write-Error2 "Docker is not running!"
            Write-Info "Please start Docker Desktop and try again."
            Pause-Safe
            return
        }
        
        Write-Host "Building and starting Docker containers..." -ForegroundColor Cyan
        Write-Host ""
        
        docker compose up -d --build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "Application started successfully!"
            Write-Host ""
            Write-Host "Access the application at:" -ForegroundColor Cyan
            Write-Host "  http://localhost:8080" -ForegroundColor White
            Write-Host ""
            
            $open = Read-Host "Open in browser? (Y/n)"
            if ($open -notmatch '^n') {
                Start-Process "http://localhost:8080"
            }
        } else {
            Write-Error2 "Failed to start Docker containers"
            Write-Host "Run diagnostics: .\SMS.ps1 and select 'Diagnose Issues'" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Starting native mode..." -ForegroundColor Cyan
        Write-Host ""
        
        # Check prerequisites
        $pythonOk = $false
        $nodeOk = $false
        
        try {
            $pyVersion = python --version 2>&1
            if ($LASTEXITCODE -eq 0 -and $pyVersion -match '3\.(1[1-9]|[2-9]\d)') {
                Write-Success "Python found: $pyVersion"
                $pythonOk = $true
            } else {
                Write-Error2 "Python 3.11+ required (found: $pyVersion)"
            }
        } catch {
            Write-Error2 "Python not found in PATH"
        }
        
        try {
            $nodeVersion = node --version 2>&1
            if ($LASTEXITCODE -eq 0 -and $nodeVersion -match 'v(1[8-9]|[2-9]\d)') {
                Write-Success "Node.js found: $nodeVersion"
                $nodeOk = $true
            } else {
                Write-Error2 "Node.js 18+ required (found: $nodeVersion)"
            }
        } catch {
            Write-Error2 "Node.js not found in PATH"
        }
        
        if (-not ($pythonOk -and $nodeOk)) {
            Write-Host ""
            Write-Error2 "Prerequisites not met. Cannot start in native mode."
            Write-Info "Install Python 3.11+ and Node.js 18+, or use Docker mode."
            Pause-Safe
            return
        }
        
        # Run setup if needed
        if (-not (Test-Path "backend/venv") -or -not (Test-Path "frontend/node_modules")) {
            Write-Host ""
            Write-Info "First-time setup required..."
            & ".\scripts\SETUP.ps1"
            if ($LASTEXITCODE -ne 0) {
                Write-Error2 "Setup failed"
                Pause-Safe
                return
            }
        }
        
        # Start services
        & ".\scripts\legacy\RUN.ps1"
    }
    
    Write-Host ""
    Pause-Safe
}

function Stop-Application {
    param([switch]$Force)
    
    $status = Get-SystemStatus
    
    if ($status.State -eq 'NOT_RUNNING') {
        Write-Info "Application is not running"
        return
    }
    
    Write-Header "STOPPING APPLICATION"
    
    if ($status.State -in @('DOCKER', 'DOCKER_STOPPED')) {
        Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
        docker compose stop
        
        if ($Force) {
            Write-Host "Removing containers..." -ForegroundColor Yellow
            docker compose down
        }
        
        Write-Success "Docker containers stopped"
    }
    
    if ($status.State -eq 'NATIVE') {
        Write-Host "Stopping native processes..." -ForegroundColor Yellow
        & ".\scripts\STOP.ps1"
        Write-Success "Native processes stopped"
    }
    
    Write-Host ""
}

function Restart-Application {
    Write-Header "RESTARTING APPLICATION"
    
    $status = Get-SystemStatus
    $mode = if ($status.State -eq 'DOCKER' -or $status.State -eq 'DOCKER_STOPPED') { 'docker' } else { 'native' }
    
    Stop-Application
    Start-Sleep -Seconds 3
    Start-Application -Mode $mode
}

# ============================================================================
#  DATABASE MANAGEMENT
# ============================================================================

function Backup-Database {
    Write-Header "BACKUP DATABASE"
    
    $status = Get-SystemStatus
    
    if ($status.State -eq 'DOCKER') {
        # Docker mode - backup from volume
        if (-not $status.Docker.Running) {
            Write-Error2 "Docker is not running"
            Pause-Safe
            return
        }
        
        $backupDir = Join-Path $scriptDir "backups"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $backupFile = "student_management_$timestamp.db"
        
        Write-Host "Creating backup from Docker volume..." -ForegroundColor Cyan
        Write-Host "  Target: $backupFile" -ForegroundColor Gray
        Write-Host ""
        
        $backupDirUnix = $backupDir.Replace('\', '/').Replace(':', '').ToLower()
        if (-not $backupDirUnix.StartsWith('/')) { $backupDirUnix = '/' + $backupDirUnix }
        
        docker run --rm -v sms_data:/data -v "${backupDirUnix}:/backup" alpine sh -c "cp /data/student_management.db /backup/$backupFile"
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $backupDir $backupFile))) {
            $size = [math]::Round((Get-Item (Join-Path $backupDir $backupFile)).Length / 1KB, 2)
            Write-Success "Backup created successfully ($size KB)"
            Write-Host "  Location: backups\$backupFile" -ForegroundColor Gray
        } else {
            Write-Error2 "Backup failed"
        }
    } else {
        # Native mode - copy file directly
        $dbPath = Join-Path $scriptDir "data\student_management.db"
        if (-not (Test-Path $dbPath)) {
            Write-Error2 "Database file not found"
            Pause-Safe
            return
        }
        
        $backupDir = Join-Path $scriptDir "backups"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $backupFile = "student_management_$timestamp.db"
        $backupPath = Join-Path $backupDir $backupFile
        
        Write-Host "Creating backup..." -ForegroundColor Cyan
        Copy-Item $dbPath $backupPath
        
        if (Test-Path $backupPath) {
            $size = [math]::Round((Get-Item $backupPath).Length / 1KB, 2)
            Write-Success "Backup created successfully ($size KB)"
            Write-Host "  Location: backups\$backupFile" -ForegroundColor Gray
        } else {
            Write-Error2 "Backup failed"
        }
    }
    
    Write-Host ""
    Pause-Safe
}

function Restore-Database {
    Write-Header "RESTORE DATABASE"
    
    $backupDir = Join-Path $scriptDir "backups"
    if (-not (Test-Path $backupDir)) {
        Write-Warning2 "No backups folder found"
        Pause-Safe
        return
    }
    
    $backups = Get-ChildItem -Path $backupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Warning2 "No backup files found"
        Pause-Safe
        return
    }
    
    Write-Host "Available backups:`n" -ForegroundColor Cyan
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $size = [math]::Round($backups[$i].Length / 1KB, 2)
        $age = (Get-Date) - $backups[$i].LastWriteTime
        $ageStr = if ($age.Days -gt 0) { "$($age.Days)d ago" } 
                  elseif ($age.Hours -gt 0) { "$($age.Hours)h ago" }
                  else { "$($age.Minutes)m ago" }
        Write-Host ("  [{0}] {1}" -f $i, $backups[$i].Name) -ForegroundColor White
        Write-Host ("      {0} KB, {1}" -f $size, $ageStr) -ForegroundColor Gray
    }
    
    Write-Host ""
    $selection = Read-Host "Select backup number (or Enter to cancel)"
    if ([string]::IsNullOrWhiteSpace($selection)) {
        Write-Info "Cancelled"
        return
    }
    
    if ($selection -notmatch '^\d+$' -or [int]$selection -ge $backups.Count) {
        Write-Error2 "Invalid selection"
        Pause-Safe
        return
    }
    
    $selectedBackup = $backups[[int]$selection]
    
    Write-Host ""
    Write-Host "WARNING: This will overwrite the current database!" -ForegroundColor Red
    $confirm = Read-Host "Type 'RESTORE' to confirm"
    
    if ($confirm -ne 'RESTORE') {
        Write-Info "Cancelled"
        return
    }
    
    $status = Get-SystemStatus
    
    # Stop application if running
    if ($status.State -ne 'NOT_RUNNING') {
        Write-Host ""
        Write-Info "Stopping application..."
        Stop-Application -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Host ""
    Write-Host "Restoring backup..." -ForegroundColor Cyan
    
    if ($status.Docker.Installed -and $status.Docker.Running) {
        # Restore to Docker volume
        $backupDirUnix = $backupDir.Replace('\', '/').Replace(':', '').ToLower()
        if (-not $backupDirUnix.StartsWith('/')) { $backupDirUnix = '/' + $backupDirUnix }
        
        docker run --rm -v sms_data:/data -v "${backupDirUnix}:/backup" alpine sh -c "cp /backup/$($selectedBackup.Name) /data/student_management.db"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database restored successfully"
        } else {
            Write-Error2 "Restore failed"
        }
    } else {
        # Restore native file
        $dbPath = Join-Path $scriptDir "data\student_management.db"
        $dataDir = Join-Path $scriptDir "data"
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Path $dataDir | Out-Null
        }
        
        Copy-Item $selectedBackup.FullName $dbPath -Force
        
        if (Test-Path $dbPath) {
            Write-Success "Database restored successfully"
        } else {
            Write-Error2 "Restore failed"
        }
    }
    
    Write-Host ""
    Write-Info "Restart the application to use the restored database"
    Write-Host ""
    Pause-Safe
}

# ============================================================================
#  DIAGNOSTICS & TROUBLESHOOTING
# ============================================================================

function Show-Diagnostics {
    Write-Header "SYSTEM DIAGNOSTICS"
    
    $status = Show-SystemStatus -Detailed
    
    Write-Host "Common Issues:" -ForegroundColor Yellow
    Write-Host ""
    
    # Check for port conflicts
    if (Test-Port 8000) {
        Write-Warning2 "Port 8000 is in use"
        Write-Host "  Action: Run port diagnostics (option 6) to see what's using it" -ForegroundColor Gray
    }
    
    if (Test-Port 5173) {
        Write-Warning2 "Port 5173 is in use"
        Write-Host "  Action: Run port diagnostics (option 6) to see what's using it" -ForegroundColor Gray
    }
    
    if (-not $status.Docker.Installed) {
        Write-Info "Docker is not installed"
        Write-Host "  Impact: Can only run in native mode" -ForegroundColor Gray
        Write-Host "  Solution: Install Docker Desktop for easier deployment" -ForegroundColor Gray
    } elseif (-not $status.Docker.Running) {
        Write-Warning2 "Docker is installed but not running"
        Write-Host "  Solution: Start Docker Desktop" -ForegroundColor Gray
    }
    
    if (-not (Test-Path "backend/venv")) {
        Write-Warning2 "Python virtual environment not found"
        Write-Host "  Solution: Run setup (option S)" -ForegroundColor Gray
    }
    
    if (-not (Test-Path "frontend/node_modules")) {
        Write-Warning2 "Node modules not installed"
        Write-Host "  Solution: Run setup (option S)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Pause-Safe
}

function Debug-Ports {
    Write-Header "PORT DIAGNOSTICS"
    
    $ports = @(
        @{Port=8000; Service="Backend API"},
        @{Port=5173; Service="Frontend Dev Server"},
        @{Port=8080; Service="Docker Frontend"}
    )
    
    foreach ($p in $ports) {
        Write-Host "$($p.Service) (Port $($p.Port)):" -ForegroundColor Cyan
        
        try {
            $conn = Get-NetTCPConnection -LocalPort $p.Port -ErrorAction SilentlyContinue 2>$null
            if ($conn) {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  ✓ In use by: " -NoNewline -ForegroundColor Yellow
                    Write-Host "$($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor White
                    
                    $cmdLine = (Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
                    if ($cmdLine) {
                        Write-Host "    Command: $cmdLine" -ForegroundColor Gray
                    }
                    
                    Write-Host "    To kill: " -NoNewline -ForegroundColor Gray
                    Write-Host "Stop-Process -Id $($proc.Id) -Force" -ForegroundColor White
                } else {
                    Write-Host "  ✓ In use by PID: $($conn.OwningProcess)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  • Available" -ForegroundColor Green
            }
        } catch {
            Write-Host "  • Available" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    Pause-Safe
}

function Run-FullDiagnostics {
    Write-Host "Running full system diagnostics..." -ForegroundColor Cyan
    Write-Host ""
    & ".\scripts\internal\DIAGNOSE_STATE.ps1"
    Pause-Safe
}

# ============================================================================
#  MAINTENANCE & UTILITIES
# ============================================================================

function Show-Logs {
    $status = Get-SystemStatus
    
    Write-Header "VIEW LOGS"
    
    if ($status.State -eq 'DOCKER') {
        Write-Host "Showing Docker container logs (last 100 lines)..." -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop following logs`n" -ForegroundColor Gray
        
        docker compose logs --tail=100 -f
    } elseif ($status.State -eq 'NATIVE') {
        Write-Host "Log locations:" -ForegroundColor Cyan
        Write-Host "  Backend:  backend/logs/structured.json" -ForegroundColor White
        Write-Host "  Frontend: Console output in terminal" -ForegroundColor White
        Write-Host ""
        
        if (Test-Path "backend/logs/structured.json") {
            Write-Host "Last 20 backend log entries:" -ForegroundColor Yellow
            Write-Host ""
            Get-Content "backend/logs/structured.json" -Tail 20
        }
    } else {
        Write-Warning2 "Application is not running"
    }
    
    Write-Host ""
    Pause-Safe
}

function Open-InBrowser {
    $status = Get-SystemStatus
    
    if ($status.State -in @('DOCKER', 'NATIVE')) {
        $url = if ($status.State -eq 'DOCKER') { "http://localhost:8080" } else { "http://localhost:5173" }
        Write-Info "Opening $url in browser..."
        Start-Process $url
    } else {
        Write-Warning2 "Application is not running"
        Pause-Safe
    }
}

function Show-Menu {
    Clear-Host
    $status = Get-SystemStatus
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        STUDENT MANAGEMENT SYSTEM - Control Panel                   ║" -ForegroundColor Cyan
    Write-Host "║        Version: $version".PadRight(68) + "║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Show current state
    Write-Host " Status: " -NoNewline
    switch ($status.State) {
        'DOCKER' { Write-Host "● RUNNING (Docker)" -ForegroundColor Green }
        'NATIVE' { Write-Host "● RUNNING (Native)" -ForegroundColor Green }
        'DOCKER_STOPPED' { Write-Host "○ Stopped (Docker containers exist)" -ForegroundColor Yellow }
        'NOT_RUNNING' { Write-Host "○ Not Running" -ForegroundColor Red }
    }
    Write-Host ""
    
    Write-Host " ┌─ APPLICATION CONTROL ─────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host " │  1. Start Application (Auto-detect mode)                      │" -ForegroundColor White
    Write-Host " │  2. Start Application (Docker mode)                           │" -ForegroundColor White
    Write-Host " │  3. Start Application (Native mode)                           │" -ForegroundColor White
    Write-Host " │  4. Stop Application                                          │" -ForegroundColor White
    Write-Host " │  5. Restart Application                                       │" -ForegroundColor White
    Write-Host " └────────────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host " ┌─ DIAGNOSTICS & TROUBLESHOOTING ───────────────────────────────┐" -ForegroundColor Yellow
    Write-Host " │  6. View System Status & Diagnostics                          │" -ForegroundColor White
    Write-Host " │  7. Debug Port Conflicts                                      │" -ForegroundColor White
    Write-Host " │  8. Run Full Diagnostics (Comprehensive)                      │" -ForegroundColor White
    Write-Host " │  9. View Application Logs                                     │" -ForegroundColor White
    Write-Host " └────────────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host " ┌─ DATABASE MANAGEMENT ─────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host " │  B. Backup Database                                            │" -ForegroundColor White
    Write-Host " │  R. Restore Database from Backup                               │" -ForegroundColor White
    Write-Host " │  M. Manage Backups (List/Delete)                               │" -ForegroundColor White
    Write-Host " └────────────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host " ┌─ UTILITIES ───────────────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host " │  O. Open Application in Browser                                │" -ForegroundColor White
    Write-Host " │  S. Run Setup (First-time setup or reinstall dependencies)    │" -ForegroundColor White
    Write-Host " │  D. Advanced Developer Tools                                   │" -ForegroundColor White
    Write-Host " │  H. Help & Documentation                                       │" -ForegroundColor White
    Write-Host " └────────────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host " ┌─ EXIT ────────────────────────────────────────────────────────┐" -ForegroundColor Gray
    Write-Host " │  0. Exit                                                       │" -ForegroundColor White
    Write-Host " └────────────────────────────────────────────────────────────────┘" -ForegroundColor Gray
    Write-Host ""
}

function Manage-Backups {
    Write-Header "BACKUP MANAGER"
    
    $backupDir = Join-Path $scriptDir "backups"
    
    if (-not (Test-Path $backupDir)) {
        Write-Info "No backups folder exists yet"
        Write-Host "Create a backup first (option B)" -ForegroundColor Gray
        Pause-Safe
        return
    }
    
    $backups = Get-ChildItem -Path $backupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Info "No backup files found"
        Pause-Safe
        return
    }
    
    Write-Host "Available backups:`n" -ForegroundColor Cyan
    $totalSize = 0
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $size = [math]::Round($backups[$i].Length / 1KB, 2)
        $totalSize += $backups[$i].Length
        $age = (Get-Date) - $backups[$i].LastWriteTime
        $ageStr = if ($age.Days -gt 0) { "$($age.Days)d" } 
                  elseif ($age.Hours -gt 0) { "$($age.Hours)h" }
                  else { "$($age.Minutes)m" }
        Write-Host ("  [{0}] {1}" -f $i, $backups[$i].Name) -ForegroundColor White
        Write-Host ("      {0} KB, {1} ago" -f $size, $ageStr) -ForegroundColor Gray
    }
    $totalMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "`n  Total: $($backups.Count) backups, $totalMB MB`n" -ForegroundColor Cyan
    
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  [Number] Delete specific backup" -ForegroundColor White
    Write-Host "  [O] Open backups folder in Explorer" -ForegroundColor White
    Write-Host "  [C] Clean old backups (keep latest 10)" -ForegroundColor White
    Write-Host "  [Enter] Return to main menu" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Select option"
    
    if ([string]::IsNullOrWhiteSpace($choice)) {
        return
    }
    
    switch ($choice.ToUpper()) {
        "O" {
            Start-Process "explorer.exe" -ArgumentList $backupDir
            Write-Success "Opened in Explorer"
            Start-Sleep -Seconds 1
        }
        "C" {
            if ($backups.Count -le 10) {
                Write-Info "Only $($backups.Count) backups exist. Nothing to clean."
                Start-Sleep -Seconds 2
            } else {
                $toDelete = $backups | Select-Object -Skip 10
                Write-Host ""
                Write-Host "Will delete $($toDelete.Count) old backups" -ForegroundColor Yellow
                $confirm = Read-Host "Type 'DELETE' to confirm"
                if ($confirm -eq 'DELETE') {
                    $toDelete | ForEach-Object { Remove-Item $_.FullName -Force }
                    Write-Success "Deleted $($toDelete.Count) old backups"
                    Start-Sleep -Seconds 1
                }
            }
        }
        default {
            if ($choice -match '^\d+$' -and [int]$choice -lt $backups.Count) {
                $toDelete = $backups[[int]$choice]
                Write-Host ""
                Write-Host "Delete: $($toDelete.Name)?" -ForegroundColor Yellow
                $confirm = Read-Host "Type 'DELETE' to confirm"
                if ($confirm -eq 'DELETE') {
                    Remove-Item $toDelete.FullName -Force
                    Write-Success "Backup deleted"
                    Start-Sleep -Seconds 1
                }
            } else {
                Write-Error2 "Invalid option"
                Start-Sleep -Seconds 1
            }
        }
    }
}

function Run-Setup {
    Write-Header "SETUP & DEPENDENCY INSTALLATION"
    
    Write-Host "This will install/update all dependencies..." -ForegroundColor Cyan
    Write-Host ""
    
    $confirm = Read-Host "Continue? (Y/n)"
    if ($confirm -match '^n') {
        return
    }
    
    Write-Host ""
    & ".\scripts\SETUP.ps1"
    
    Write-Host ""
    Pause-Safe
}

function Show-Help {
    Write-Header "HELP & DOCUMENTATION"
    
    Write-Host "Quick Start Guide:" -ForegroundColor Cyan
    Write-Host "  1. First time: Select option 'S' to run setup" -ForegroundColor White
    Write-Host "  2. Start app: Select option '1' to start (auto-detects best mode)" -ForegroundColor White
    Write-Host "  3. Access: Open http://localhost:8080 (Docker) or http://localhost:5173 (Native)" -ForegroundColor White
    Write-Host "  4. Stop: Select option '4' to stop the application" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Deployment Modes:" -ForegroundColor Cyan
    Write-Host "  • Docker:  Runs in containers (recommended, easier)" -ForegroundColor White
    Write-Host "  • Native:  Runs directly on your system (requires Python + Node.js)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Common Tasks:" -ForegroundColor Cyan
    Write-Host "  • Backup database:    Option 'B'" -ForegroundColor White
    Write-Host "  • Restore database:   Option 'R'" -ForegroundColor White
    Write-Host "  • View logs:          Option '9'" -ForegroundColor White
    Write-Host "  • Troubleshoot:       Option '6' or '8'" -ForegroundColor White
    Write-Host "  • Port conflicts:     Option '7'" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Documentation Files:" -ForegroundColor Cyan
    Write-Host "  • README.md               - Main documentation" -ForegroundColor White
    Write-Host "  • docs/QUICKSTART.md      - Quick start guide" -ForegroundColor White
    Write-Host "  • docs/DOCKER.md          - Docker deployment guide" -ForegroundColor White
    Write-Host "  • docs/TROUBLESHOOTING.md - Common issues & solutions" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Command Line Options:" -ForegroundColor Cyan
    Write-Host "  .\SMS.ps1 -Quick    - Quick start (auto mode)" -ForegroundColor White
    Write-Host "  .\SMS.ps1 -Status   - Show status and exit" -ForegroundColor White
    Write-Host "  .\SMS.ps1 -Stop     - Stop all services" -ForegroundColor White
    Write-Host "  .\SMS.ps1 -Help     - Show this help" -ForegroundColor White
    Write-Host ""
    
    Pause-Safe
}

# ============================================================================
#  COMMAND LINE PARAMETER HANDLING
# ============================================================================

if ($Help) {
    Show-Help
    exit 0
}

if ($Status) {
    Show-SystemStatus -Detailed
    exit 0
}

if ($Stop) {
    Stop-Application -Force
    exit 0
}

if ($Quick) {
    Write-Header "QUICK START"
    Start-Application -Mode 'auto'
    exit 0
}

# ============================================================================
#  MAIN MENU LOOP
# ============================================================================

while ($true) {
    Show-Menu
    $choice = Read-Host " Select option"
    
    switch ($choice.ToUpper()) {
        "1" { Start-Application -Mode 'auto' }
        "2" { Start-Application -Mode 'docker' }
        "3" { Start-Application -Mode 'native' }
        "4" { Stop-Application }
        "5" { Restart-Application }
        "6" { Show-Diagnostics }
        "7" { Debug-Ports }
        "8" { Run-FullDiagnostics }
        "9" { Show-Logs }
        "B" { Backup-Database }
        "R" { Restore-Database }
        "M" { Manage-Backups }
        "O" { Open-InBrowser }
        "S" { Run-Setup }
        "D" { 
            Write-Host ""
            Write-Info "Opening Advanced Developer Tools..."
            Start-Sleep -Seconds 1
            & ".\scripts\internal\DEVTOOLS.ps1"
        }
        "H" { Show-Help }
        "0" {
            Write-Host ""
            Write-Host " Goodbye!" -ForegroundColor Cyan
            Write-Host ""
            exit 0
        }
        default {
            Write-Host ""
            Write-Error2 "Invalid option. Please try again."
            Start-Sleep -Seconds 1
        }
    }
}
