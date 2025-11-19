<#
.SYNOPSIS
    Student Management System - One-Click Deployment Script

.DESCRIPTION
    Simple entry point for end users to start, stop, update, and manage the SMS application.
    Uses fullstack Docker container for single-command deployment.

.PARAMETER Update
    Fast update path (cached build). Creates backup, then performs a standard Docker build using cached layers.
    Use -UpdateNoCache for a full clean rebuild.

.PARAMETER UpdateNoCache
    Clean update path. Creates backup, prunes build/image cache, and rebuilds with --no-cache.

.PARAMETER FastUpdate (DEPRECATED)
    Backward-compatible alias for -Update. Will be removed in a future release.

.PARAMETER Stop
    Stop the application cleanly

.PARAMETER Status
    Check if application is running

.PARAMETER Logs
    Show application logs

.PARAMETER Backup
    Create a manual backup

.EXAMPLE
    .\RUN.ps1           # Start the application
    .\RUN.ps1 -Update   # Update with backup
    .\RUN.ps1 -Stop     # Stop cleanly
    .\RUN.ps1 -Status   # Check status

.NOTES
    Version: 1.4.0
    Part of Phase 1: One-Click Deployment
#>

param(
    [switch]$Update,
    [switch]$UpdateNoCache,
    [switch]$FastUpdate, # deprecated
    [switch]$Stop,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Backup,
    [switch]$Prune,
    [switch]$PruneAll,
    [switch]$Help,
    [switch]$NoPause,
    [switch]$WithMonitoring,
    [int]$GrafanaPort = 3000
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$VERSION_FILE = Join-Path $SCRIPT_DIR "VERSION"
$BACKUPS_DIR = Join-Path $SCRIPT_DIR "backups"
$MAX_BACKUPS = 10

# Read version from VERSION file
if (Test-Path $VERSION_FILE) {
    $VERSION = (Get-Content $VERSION_FILE -Raw).Trim()
} else {
    $VERSION = "latest"
}

$IMAGE_NAME = "sms-fullstack"
$IMAGE_TAG = "${IMAGE_NAME}:${VERSION}"
$CONTAINER_NAME = "sms-app"
$PORT = 8082
$INTERNAL_PORT = 8000
$VOLUME_NAME = "sms_data"
$MONITORING_COMPOSE_FILE = Join-Path $SCRIPT_DIR "docker-compose.monitoring.yml"
$DEFAULT_GRAFANA_PORT = 3000
$DEFAULT_PROMETHEUS_PORT = 9090

function Get-ParentProcessName {
    if ($script:ParentProcessName) {
        return $script:ParentProcessName
    }

    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
        if ($null -eq $process) {
            return ""
        }

        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.ParentProcessId)"
        $script:ParentProcessName = $parent.Name
        return $script:ParentProcessName
    }
    catch {
        return ""
    }
}

function Should-Pause {
    if ($NoPause) {
        return $false
    }

    $parentName = Get-ParentProcessName
    if ([string]::IsNullOrWhiteSpace($parentName)) {
        return $false
    }

    return ($parentName -ieq "explorer.exe")
}

function Pause-IfNeeded {
    param(
        [switch]$OfferStop
    )

    if (-not (Should-Pause)) {
        return
    }

    try {
        if ($OfferStop) {
            $status = Get-ContainerStatus
            if ($status -and $status.IsRunning) {
                Write-Host ""
                $response = Read-Host "Press Enter to leave SMS running, or type STOP to shut it down now"
                if ($response -and $response.Trim() -match '^(stop|s)$') {
                    Write-Host ""
                    Write-Info "Stopping SMS container before exit..."
                    $stopResult = Stop-Application
                    if ($stopResult -ne 0) {
                        Write-Error-Message "Automatic stop returned exit code $stopResult"
                    }
                    Write-Host ""
                    [void](Read-Host "Press Enter to close this window")
                    return
                }

                return
            }
        }

        Write-Host ""
        [void](Read-Host "Press Enter to close this window")
    }
    catch {
        # If Read-Host fails (for example, input redirected), just ignore.
    }
}

function Exit-Script {
    param(
        [int]$Code = 0,
        [switch]$SkipPause,
        [switch]$OfferStop
    )

    if (-not $SkipPause) {
        Pause-IfNeeded -OfferStop:$OfferStop
    }

    exit $Code
}

# Determine parent process once so we can decide if we should pause before exiting.
$script:ParentProcessName = $null

# ============================================================================
# TRAP HANDLER - Graceful Shutdown
# ============================================================================

trap {
    Write-Host "`n`n⚠️  Error occurred: $_" -ForegroundColor Red
    Write-Host "Stack trace:" -ForegroundColor DarkGray
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray

    # If container is starting, try to stop it
    $running = docker ps -q -f name=$CONTAINER_NAME 2>$null
    if ($running) {
        Write-Host "`nCleaning up container..." -ForegroundColor Yellow
        docker stop $CONTAINER_NAME 2>$null | Out-Null
    }

    Write-Host "`nExiting..." -ForegroundColor DarkGray
    Exit-Script -Code 1
}

# Ctrl+C handler for graceful shutdown without affecting normal exit
$script:CancelRegistration = Register-EngineEvent -SourceIdentifier ConsoleCancelEvent -Action {
    if ($null -eq $eventArgs -or (
        $eventArgs.SpecialKey -ne [ConsoleSpecialKey]::ControlC -and 
        $eventArgs.SpecialKey -ne [ConsoleSpecialKey]::ControlBreak)) {
        return
    }

    $eventArgs.Cancel = $true
    Write-Host "`n`n🛑 Interrupt received. Stopping gracefully..." -ForegroundColor Yellow

    $running = docker ps -q -f name=$CONTAINER_NAME 2>$null
    if ($running) {
        Write-Host "Stopping container..." -ForegroundColor Yellow
        docker stop $CONTAINER_NAME 2>$null | Out-Null
        Write-Host "✅ Container stopped cleanly" -ForegroundColor Green
    }

    Unregister-Event -SourceIdentifier ConsoleCancelEvent -ErrorAction SilentlyContinue
    Exit-Script -Code 0 -SkipPause
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Message.PadRight(58))  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Test-DockerAvailable {
    try {
        $null = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $false
        }

        $null = docker ps 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Docker is installed but not running"
            Write-Info "Please start Docker Desktop and try again"
            return $false
        }

        return $true
    }
    catch {
        return $false
    }
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $connections = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
        return ($null -ne $connections -and $connections.Count -gt 0)
    }
    catch {
        return $false
    }
}

function Find-AvailablePort {
    param(
        [int]$StartPort = 3000,
        [int]$MaxAttempts = 10
    )
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $testPort = $StartPort + $i
        if (-not (Test-PortInUse -Port $testPort)) {
            return $testPort
        }
    }
    return $null
}

function Get-MonitoringStatus {
    $prometheus = docker ps -q -f name=sms-prometheus 2>$null
    $grafana = docker ps -q -f name=sms-grafana 2>$null
    
    return @{
        PrometheusRunning = ($null -ne $prometheus -and $prometheus.Length -gt 0)
        GrafanaRunning = ($null -ne $grafana -and $grafana.Length -gt 0)
        IsRunning = (($null -ne $prometheus -and $prometheus.Length -gt 0) -and ($null -ne $grafana -and $grafana.Length -gt 0))
    }
}

function Stop-MonitoringStack {
    Write-Info "Stopping monitoring stack..."
    
    Push-Location $SCRIPT_DIR
    try {
        docker-compose -f $MONITORING_COMPOSE_FILE down 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Monitoring stack stopped"
            return $true
        }
        return $false
    }
    finally {
        Pop-Location
    }
}

function Start-MonitoringStack {
    param(
        [int]$GrafanaPortOverride = $DEFAULT_GRAFANA_PORT
    )
    
    Write-Info "Starting monitoring stack..."
    
    # Check for port conflicts
    $actualGrafanaPort = $GrafanaPortOverride
    if (Test-PortInUse -Port $actualGrafanaPort) {
        Write-Warning "Port $actualGrafanaPort is already in use"
        $availablePort = Find-AvailablePort -StartPort $actualGrafanaPort
        
        if ($null -eq $availablePort) {
            Write-Error-Message "Could not find available port for Grafana (tried $actualGrafanaPort-$($actualGrafanaPort + 9))"
            Write-Info "Please free up port $actualGrafanaPort or specify a different port with -GrafanaPort"
            return $false
        }
        
        $actualGrafanaPort = $availablePort
        Write-Info "Using alternative port for Grafana: $actualGrafanaPort"
    }
    
    # Check if Prometheus port is available
    if (Test-PortInUse -Port $DEFAULT_PROMETHEUS_PORT) {
        Write-Warning "Port $DEFAULT_PROMETHEUS_PORT (Prometheus) is already in use"
        Write-Info "Monitoring may not start correctly if Prometheus cannot bind to its port"
    }
    
    Push-Location $SCRIPT_DIR
    try {
        # Set Grafana port via environment variable
        $env:GRAFANA_PORT = $actualGrafanaPort
        
        # Start monitoring stack
        docker-compose -f $MONITORING_COMPOSE_FILE up -d 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to start monitoring stack"
            return $false
        }
        
        Write-Success "Monitoring stack started"
        Write-Host ""
        Write-Host "  📊 Grafana:    " -NoNewline -ForegroundColor Cyan
        Write-Host "http://localhost:$actualGrafanaPort" -ForegroundColor White -NoNewline
        Write-Host " (admin/admin)" -ForegroundColor DarkGray
        Write-Host "  🔍 Prometheus: " -NoNewline -ForegroundColor Cyan
        Write-Host "http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor White
        Write-Host "  🎯 Power Page: " -NoNewline -ForegroundColor Cyan
        Write-Host "http://localhost:${PORT}/power" -ForegroundColor White -NoNewline
        Write-Host " (embedded dashboards)" -ForegroundColor DarkGray
        Write-Host ""
        
        return $true
    }
    finally {
        Pop-Location
    }
}

function Get-ImagesInUse {
    try {
        $used = docker ps -a --format '{{.Image}}' 2>$null
        if (-not $used) { return @() }
        return ($used -split "`n" | Where-Object { $_ -and $_.Trim() })
    } catch { return @() }
}

function Prune-DockerResources {
    param(
        [switch]$All
    )

    Write-Header "Docker Prune"

    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        return 1
    }

    try {
        # 1) Remove stopped containers (safe)
        Write-Info "Pruning stopped containers..."
        docker container prune -f 2>$null | Out-Null

        # 2) Remove dangling and unused images (safe)
        Write-Info "Pruning dangling images..."
        docker image prune -f 2>$null | Out-Null

        # 3) Remove build cache (more aggressive)
        Write-Info "Pruning builder cache (all unused layers)..."
        docker builder prune -af 2>$null | Out-Null

        # 4) Remove old sms-fullstack images no longer used by any container
        Write-Info "Detecting obsolete sms-fullstack images..."
        $currentTag = $IMAGE_TAG
        $inUse = Get-ImagesInUse
        $smsImages = docker images --format '{{.Repository}}:{{.Tag}}' 2>$null | Where-Object { $_ -like 'sms-fullstack:*' }
        $toRemove = @()
        foreach ($img in $smsImages) {
            if ($img -ne $currentTag -and ($inUse -notcontains $img)) {
                $toRemove += $img
            }
        }
        if ($toRemove.Count -gt 0) {
            Write-Info "Removing obsolete images: $($toRemove -join ', ')"
            foreach ($img in $toRemove) {
                try { docker rmi -f $img 2>$null | Out-Null } catch { }
            }
        } else {
            Write-Info "No obsolete sms-fullstack images found"
        }

        if ($All) {
            # 5) Optionally prune unused networks (safe)
            Write-Info "Pruning unused networks..."
            docker network prune -f 2>$null | Out-Null

            # IMPORTANT: Do NOT prune volumes here to protect user data (sms_data)
            Write-Warning "Volume prune skipped (protects persistent data volume 'sms_data'). Use SUPER_CLEAN_AND_DEPLOY.ps1 for full wipe."
        }

        Write-Success "Docker prune completed"
        return 0
    }
    catch {
        Write-Error-Message "Docker prune encountered an error: $_"
        return 1
    }
}

function Get-ContainerStatus {
    $container = docker ps -a --filter "name=^${CONTAINER_NAME}$" --format "{{.ID}}\t{{.Status}}\t{{.Ports}}" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($container)) {
        return $null
    }

    $parts = $container -split '\t'
    $status = $parts[1]

    return @{
        ID = $parts[0]
        Status = $status
        IsRunning = $status -match '^Up '
        IsHealthy = $status -match '\(healthy\)'
        Ports = if ($parts.Count -gt 2) { $parts[2] } else { "" }
    }
}

function Backup-Database {
    param(
        [string]$Reason = "manual"
    )

    Write-Info "Creating database backup ($Reason)..."

    # Ensure backups directory exists
    if (-not (Test-Path $BACKUPS_DIR)) {
        New-Item -ItemType Directory -Path $BACKUPS_DIR -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "sms_backup_${timestamp}.db"
    $backupPath = Join-Path $BACKUPS_DIR $backupName

    try {
        # Check if container is running
        $containerStatus = Get-ContainerStatus

        if ($containerStatus -and $containerStatus.IsRunning) {
            # Backup from running container
            Write-Info "Backing up from running container..."
            docker exec $CONTAINER_NAME sh -c "cp /app/data/student_management.db /app/data/backup_temp.db" 2>$null
            docker cp "${CONTAINER_NAME}:/app/data/backup_temp.db" $backupPath 2>$null
            docker exec $CONTAINER_NAME sh -c "rm -f /app/data/backup_temp.db" 2>$null
        } else {
            # Backup from volume
            Write-Info "Backing up from Docker volume..."
            docker run --rm `
                -v ${VOLUME_NAME}:/data:ro `
                -v "${BACKUPS_DIR}:/backups" `
                alpine:latest `
                sh -c "cp /data/student_management.db /backups/${backupName}" 2>$null
        }

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $backupPath)) {
            Write-Error-Message "Backup failed"
            return $false
        }

        # Verify backup
        $backupSize = (Get-Item $backupPath).Length
        if ($backupSize -lt 1KB) {
            Write-Error-Message "Backup file is too small, may be corrupted"
            Remove-Item $backupPath -Force
            return $false
        }

        # Calculate checksum
        $hash = (Get-FileHash -Path $backupPath -Algorithm SHA256).Hash.Substring(0, 8)
        $newBackupName = "sms_backup_${timestamp}_${hash}.db"
    Rename-Item -Path $backupPath -NewName $newBackupName -Force

        Write-Success "Backup created: $newBackupName ($('{0:N2}' -f ($backupSize / 1MB)) MB)"

        # Cleanup old backups (keep last $MAX_BACKUPS)
        $allBackups = Get-ChildItem -Path $BACKUPS_DIR -Filter "sms_backup_*.db" | Sort-Object LastWriteTime -Descending
        if ($allBackups.Count -gt $MAX_BACKUPS) {
            $toDelete = $allBackups | Select-Object -Skip $MAX_BACKUPS
            foreach ($old in $toDelete) {
                Write-Info "Removing old backup: $($old.Name)"
                Remove-Item $old.FullName -Force
            }
        }

        return $true
    }
    catch {
        Write-Error-Message "Backup failed: $_"
        return $false
    }
}

function Wait-ForHealthy {
    param(
        [int]$TimeoutSeconds = 60
    )

    Write-Info "Waiting for application to start..."

    $elapsed = 0
    $checkInterval = 2

    while ($elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval

        # Check container status
        $status = Get-ContainerStatus
        if (-not $status) {
            Write-Host "." -NoNewline
            continue
        }

        if ($status.IsHealthy) {
            Write-Host "`n"
            Write-Success "Application is healthy and ready!"
            return $true
        }

        if (-not $status.IsRunning) {
            Write-Host "`n"
            Write-Error-Message "Container stopped unexpectedly"
            Write-Info "Check logs with: docker logs $CONTAINER_NAME"
            return $false
        }

        Write-Host "." -NoNewline
    }

    Write-Host "`n"
    Write-Error-Message "Timeout waiting for application to become healthy"
    Write-Info "The application may still be starting. Check status with: .\RUN.ps1 -Status"
    Write-Info "View logs with: .\RUN.ps1 -Logs"
    return $false
}

function Show-AccessInfo {
    param([bool]$MonitoringEnabled = $false, [bool]$WatcherEnabled = $false)
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                 🎉 SMS is now running! 🎉                    ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📱 Web Interface:  " -NoNewline -ForegroundColor Cyan
    Write-Host "http://localhost:$PORT" -ForegroundColor White
    Write-Host "  📊 API Docs:       " -NoNewline -ForegroundColor Cyan
    Write-Host "http://localhost:${PORT}/docs" -ForegroundColor White
    Write-Host "  🏥 Health Check:   " -NoNewline -ForegroundColor Cyan
    Write-Host "http://localhost:${PORT}/health" -ForegroundColor White
    
    if ($MonitoringEnabled) {
        $monStatus = Get-MonitoringStatus
        if ($monStatus.IsRunning) {
            Write-Host ""
            Write-Host "  Monitoring Stack:" -ForegroundColor Yellow
            Write-Host "    📊 Grafana (dashboards):  " -NoNewline -ForegroundColor Cyan
            Write-Host "http://localhost:$GrafanaPort" -ForegroundColor White
            Write-Host "    🔍 Prometheus (metrics):  " -NoNewline -ForegroundColor Cyan
            Write-Host "http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor White
            Write-Host "    🎯 Power Page (embedded): " -NoNewline -ForegroundColor Cyan
            Write-Host "http://localhost:${PORT}/power" -ForegroundColor White
        }
    }
    
    if ($WatcherEnabled) {
        Write-Host ""
        Write-Host "  🔄 Auto-Start Watcher: " -NoNewline -ForegroundColor Cyan
        Write-Host "ACTIVE" -ForegroundColor Green
        Write-Host "     → Click 'Start Monitoring' in Power page for automatic startup" -ForegroundColor DarkGray
    }
    
    Write-Host ""
    Write-Host "  Useful Commands:" -ForegroundColor Yellow
    Write-Host "    .\RUN.ps1 -Stop           " -NoNewline -ForegroundColor White
    Write-Host "→ Stop the application" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -WithMonitoring " -NoNewline -ForegroundColor White
    Write-Host "→ Start with monitoring" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Update         " -NoNewline -ForegroundColor White
    Write-Host "→ Update with backup" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Logs           " -NoNewline -ForegroundColor White
    Write-Host "→ View logs" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Status         " -NoNewline -ForegroundColor White
    Write-Host "→ Check status" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

function Show-Help {
    Write-Header "Student Management System - Help"
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\RUN.ps1 [OPTIONS]`n"
    Write-Host "OPTIONS:" -ForegroundColor Yellow
        Write-Host "  (no options)      Start the application (default)"
        Write-Host "  -WithMonitoring   Start with Grafana, Prometheus & monitoring stack"
        Write-Host "  -GrafanaPort      Specify custom Grafana port (default: 3000)"
        Write-Host "  -Status           Check if application is running"
        Write-Host "  -Stop             Stop the application cleanly"
        Write-Host "  -Update           Fast update: backup + cached build (default)"
        Write-Host "  -UpdateNoCache    Clean update: backup + prune cache + no-cache rebuild"
        Write-Host "  -Prune            Prune Docker caches and old images (safe; keeps volumes)"
        Write-Host "  -PruneAll         Prune caches/images and unused networks (keeps volumes)"
        Write-Host "  -FastUpdate       (Deprecated) Alias for -Update"
        Write-Host "  -Logs             Show application logs"
        Write-Host "  -Backup           Create manual database backup"
        Write-Host "  -Help             Show this help message`n"
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
        Write-Host "  .\RUN.ps1                      # Start SMS"
        Write-Host "  .\RUN.ps1 -WithMonitoring      # Start with monitoring (Grafana + Prometheus)"
        Write-Host "  .\RUN.ps1 -GrafanaPort 3001    # Use port 3001 if 3000 is busy"
        Write-Host "  .\RUN.ps1 -Status              # Check if running"
        Write-Host "  .\RUN.ps1 -Update              # Fast update (cached build)"
        Write-Host "  .\RUN.ps1 -UpdateNoCache       # Clean update (cache prune + --no-cache)"
        Write-Host "  .\RUN.ps1 -FastUpdate          # Deprecated alias for -Update"
        Write-Host "  .\RUN.ps1 -Stop                # Stop SMS`n"
}

function Show-Status {
    Write-Header "SMS Application Status"

    # Check Docker
    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        Write-Info "Please install Docker Desktop and try again"
        return 1
    }
    Write-Success "Docker is available"

    # Check container
    $status = Get-ContainerStatus
    if (-not $status) {
        Write-Info "SMS is not running"
        Write-Host "`nTo start: .\RUN.ps1`n" -ForegroundColor Yellow
        return 0
    }

    # Show status
    Write-Host "`nContainer: " -NoNewline -ForegroundColor Cyan
    Write-Host $CONTAINER_NAME -ForegroundColor White
    Write-Host "Status:    " -NoNewline -ForegroundColor Cyan
    if ($status.IsRunning) {
        Write-Host $status.Status -ForegroundColor Green
    } else {
        Write-Host $status.Status -ForegroundColor Red
    }

    if ($status.IsRunning) {
        Write-Host "Health:    " -NoNewline -ForegroundColor Cyan
        if ($status.IsHealthy) {
            Write-Host "Healthy ✅" -ForegroundColor Green
        } else {
            Write-Host "Starting..." -ForegroundColor Yellow
        }

        if ($status.Ports) {
            Write-Host "Ports:     " -NoNewline -ForegroundColor Cyan
            Write-Host $status.Ports -ForegroundColor White
        }

        Write-Host "`n📱 Web Interface: " -NoNewline -ForegroundColor Green
        Write-Host "http://localhost:$PORT" -ForegroundColor White
    } else {
        Write-Host "`nTo start: .\RUN.ps1`n" -ForegroundColor Yellow
    }
    
    # Check monitoring status
    $monStatus = Get-MonitoringStatus
    if ($monStatus.IsRunning) {
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║              Monitoring Stack Status                         ║" -ForegroundColor Cyan
        Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Prometheus: " -NoNewline -ForegroundColor Cyan
        if ($monStatus.PrometheusRunning) {
            Write-Host "Running ✅" -NoNewline -ForegroundColor Green
            Write-Host " → http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor White
        } else {
            Write-Host "Stopped ❌" -ForegroundColor Red
        }
        
        Write-Host "  Grafana:    " -NoNewline -ForegroundColor Cyan
        if ($monStatus.GrafanaRunning) {
            Write-Host "Running ✅" -NoNewline -ForegroundColor Green
            Write-Host " → http://localhost:$GrafanaPort" -ForegroundColor White
        } else {
            Write-Host "Stopped ❌" -ForegroundColor Red
        }
        
        Write-Host "  Power Page: " -NoNewline -ForegroundColor Cyan
        Write-Host "http://localhost:${PORT}/power" -ForegroundColor White -NoNewline
        Write-Host " (embedded)" -ForegroundColor DarkGray
    } else {
        Write-Host ""
        Write-Info "Monitoring stack not running"
        Write-Host "  To enable: .\RUN.ps1 -WithMonitoring" -ForegroundColor Yellow
        Write-Host "  Note: Monitoring requires Docker mode (not available in native mode)" -ForegroundColor DarkGray
    }
    
    Write-Host ""

    return 0
}

function Stop-Application {
    Write-Header "Stopping SMS Application"

    $status = Get-ContainerStatus
    if (-not $status) {
        Write-Info "SMS is not running"
    } else {
        if (-not $status.IsRunning) {
            Write-Info "SMS is already stopped"
            Write-Info "Removing stopped container..."
            docker rm $CONTAINER_NAME 2>$null | Out-Null
            Write-Success "Cleaned up"
        } else {
            Write-Info "Stopping container..."
            docker stop $CONTAINER_NAME 2>$null | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Success "SMS stopped successfully"
            } else {
                Write-Error-Message "Failed to stop SMS"
                return 1
            }
        }
    }
    
    # Check and stop monitoring if running
    $monStatus = Get-MonitoringStatus
    if ($monStatus.IsRunning) {
        Write-Host ""
        Write-Info "Monitoring stack is running"
        $response = Read-Host "Stop monitoring stack too? (Y/n)"
        if ([string]::IsNullOrWhiteSpace($response) -or $response -match '^[Yy]') {
            if (Stop-MonitoringStack) {
                return 0
            } else {
                Write-Warning "Failed to stop monitoring stack"
                return 1
            }
        } else {
            Write-Info "Leaving monitoring stack running"
        }
    }
    
    return 0
}

function Show-Logs {
    $status = Get-ContainerStatus
    if (-not $status -or -not $status.IsRunning) {
        Write-Error-Message "SMS is not running"
        Write-Info "Start it with: .\RUN.ps1"
        return 1
    }

    Write-Header "SMS Application Logs"
    Write-Info "Press Ctrl+C to stop viewing logs`n"
    docker logs -f --tail 100 $CONTAINER_NAME

    return $LASTEXITCODE
}

function CleanUpdate-Application {
    Write-Header "Clean Updating SMS Application (No Cache)"

    # Check if running
    $status = Get-ContainerStatus
    $wasRunning = $status -and $status.IsRunning

    if ($wasRunning) {
        Write-Info "Application is currently running"
    }

    # Create backup
    Write-Host ""
    if (-not (Backup-Database -Reason "before-update")) {
        Write-Error-Message "Backup failed. Update cancelled."
        Write-Info "Please backup manually before updating"
        return 1
    }

    # Stop if running
    if ($wasRunning) {
        Write-Host ""
        Write-Info "Stopping current version..."
        docker stop $CONTAINER_NAME 2>$null | Out-Null
        docker rm $CONTAINER_NAME 2>$null | Out-Null
        Write-Success "Stopped"
    }

    # Pull/rebuild image
    Write-Host ""
    Write-Info "Preparing clean rebuild (clearing Docker build cache and old images)..."
    $pruneCode = Prune-DockerResources -All:$false
    if ($pruneCode -ne 0) {
        Write-Warning "Prune step returned code $pruneCode (continuing)"
    }
    Write-Info "Building latest version (no cache)..."
    Write-Info "This may take a few minutes..."
    Write-Host ""

    docker build --pull --no-cache -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Build failed"
        Write-Info "Check your Docker configuration and try again"

        if ($wasRunning) {
            Write-Host ""
            Write-Info "Previous image still present; starting prior version..."
            # Start will use the old image since build failed and tag unchanged
            $restoreCode = Start-Application
            if ($restoreCode -ne 0) {
                return $restoreCode
            }
        }
        return 1
    }

    Write-Success "Build completed"

    # Start with new image
    Write-Host ""
    Write-Info "Starting updated version..."
    $startResult = Start-Application
    if ($startResult -ne 0) {
        return $startResult
    }

    Write-Host ""
    Write-Success "Update completed successfully!"
    Write-Info "Backup saved in: $BACKUPS_DIR"

    return 0
}

function FastUpdate-Application {
    Write-Header "Fast Updating SMS Application (Cached Build)"

    # Check if running
    $status = Get-ContainerStatus
    $wasRunning = $status -and $status.IsRunning

    if ($wasRunning) {
        Write-Info "Application is currently running"
    }

    # Create backup
    Write-Host ""
    if (-not (Backup-Database -Reason "before-fast-update")) {
        Write-Error-Message "Backup failed. Fast update cancelled."
        Write-Info "Please backup manually before updating"
        return 1
    }

    # Stop if running
    if ($wasRunning) {
        Write-Host ""
        Write-Info "Stopping current version..."
        docker stop $CONTAINER_NAME 2>$null | Out-Null
        docker rm $CONTAINER_NAME 2>$null | Out-Null
        Write-Success "Stopped"
    }

    Write-Host ""
    Write-Info "Building latest version (cached layers, --pull)..."
    Write-Info "This may take a few minutes..."
    Write-Host ""

    docker build --pull -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Build failed"
        Write-Info "Check your Docker configuration and try again"

        if ($wasRunning) {
            Write-Host ""
            Write-Info "Previous image still present; starting prior version (fast update build failed)..."
            $restoreCode = Start-Application
            if ($restoreCode -ne 0) { return $restoreCode }
        }
        return 1
    }

    Write-Success "Build completed"

    Write-Host ""
    Write-Info "Starting updated version..."
    $startResult = Start-Application
    if ($startResult -ne 0) { return $startResult }

    Write-Host ""
    Write-Success "Fast update completed successfully!"
    Write-Info "Backup saved in: $BACKUPS_DIR"
    return 0
}

function Start-Application {
    Write-Header "Starting SMS Application"

    # Check Docker
    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        return 1
    }

    # Check if already running
    $status = Get-ContainerStatus
    if ($status -and $status.IsRunning) {
        # Verify container is using correct image version
        $containerImage = docker inspect $CONTAINER_NAME --format '{{.Config.Image}}' 2>$null
        if ($containerImage -and $containerImage -ne $IMAGE_TAG) {
            Write-Warning "Container is running old image: $containerImage (expected: $IMAGE_TAG)"
            Write-Info "Restarting with correct version..."
            docker stop $CONTAINER_NAME 2>$null | Out-Null
            docker rm $CONTAINER_NAME 2>$null | Out-Null
            # Fall through to start new container
        } elseif ($status.IsHealthy) {
            Write-Success "SMS is already running!"
            Write-Info "Image version: $containerImage"
            
            # Start monitoring if requested, even if app is already running
            $monitoringStarted = $false
            if ($WithMonitoring) {
                Write-Host ""
                Write-Info "Starting monitoring stack..."
                if (Start-MonitoringStack -GrafanaPortOverride $GrafanaPort) {
                    $monitoringStarted = $true
                } else {
                    Write-Warning "Failed to start monitoring stack, but main application is running"
                }
            }
            
            Show-AccessInfo -MonitoringEnabled $monitoringStarted | Out-Null
            return 0
        } else {
            Write-Info "SMS is starting up..."
            if (Wait-ForHealthy) {
                # Start monitoring if requested
                $monitoringStarted = $false
                if ($WithMonitoring) {
                    Write-Host ""
                    Write-Info "Starting monitoring stack..."
                    if (Start-MonitoringStack -GrafanaPortOverride $GrafanaPort) {
                        $monitoringStarted = $true
                    } else {
                        Write-Warning "Failed to start monitoring stack, but main application is running"
                    }
                }
                
                Show-AccessInfo -MonitoringEnabled $monitoringStarted | Out-Null
                return 0
            } else {
                Write-Error-Message "Failed to start properly"
                Write-Info "Check logs with: .\RUN.ps1 -Logs"
                return 1
            }
        }
    }

    # Check if image exists
    Push-Location $SCRIPT_DIR
    try {
        $imageExists = docker images -q $IMAGE_TAG 2>$null
        if (-not $imageExists) {
            Write-Info "First-time setup detected"
            Write-Info "Building Docker image (this may take 5-10 minutes)..."
            Write-Info "Image tag: $IMAGE_TAG"
            Write-Host ""

            docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | ForEach-Object {
                if ($_ -match '(Step \d+/\d+|Successfully built|Successfully tagged)') {
                    Write-Host $_ -ForegroundColor DarkGray
                }
            }

            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Build failed"
                Write-Info "Please check your Docker configuration and try again"
                return 1
            }

            Write-Success "Build completed: $IMAGE_TAG"
            Write-Host ""
        }

        # Remove stopped container if exists
        if ($status -and -not $status.IsRunning) {
            Write-Info "Removing stopped container..."
            docker rm $CONTAINER_NAME 2>$null | Out-Null
        }

        # Start container
        Write-Info "Starting container..."

        # Load SECRET_KEY from .env (root) or backend/.env
        $envSecret = $null
        $envPaths = @(
            (Join-Path $SCRIPT_DIR ".env"),
            (Join-Path $SCRIPT_DIR "backend/.env")
        )
        foreach ($envPath in $envPaths) {
            if (Test-Path $envPath) {
                $allLines = @(Get-Content $envPath)
                $lines = $allLines | Where-Object { $_ -match '^SECRET_KEY\s*=\s*.+$' }
                if ($null -eq $lines) { $lines = @() }
                if ($lines.Count -gt 0) {
                    $splitLine = $lines[0] -split '=',2
                    if ($splitLine.Count -eq 2) {
                        $envSecret = $splitLine[1].Trim()
                        break
                    }
                }
            }
        }
        if (-not $envSecret -or $envSecret.Length -lt 32) {
            $envSecret = "local-dev-secret-key-20251105-change-me"
            Write-Host "[WARN] Using fallback insecure SECRET_KEY. Please set a strong SECRET_KEY in .env for production." -ForegroundColor Yellow
        }

        # Ensure triggers directory exists
        $triggersDir = Join-Path $SCRIPT_DIR "data\.triggers"
        if (-not (Test-Path $triggersDir)) {
            New-Item -ItemType Directory -Path $triggersDir -Force | Out-Null
        }
        
        docker run -d `
            --name $CONTAINER_NAME `
            -p ${PORT}:${INTERNAL_PORT} `
            -e SMS_ENV=production `
            -e SMS_EXECUTION_MODE=docker `
            -e SECRET_KEY=$envSecret `
            -e DATABASE_URL=sqlite:////app/data/student_management.db `
            -v ${VOLUME_NAME}:/app/data `
            -v "${SCRIPT_DIR}/templates:/app/templates:ro" `
            -v "${triggersDir}:/app/data/.triggers" `
            --restart unless-stopped `
            $IMAGE_TAG 2>$null | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to start container"
            Write-Info "Check Docker logs for details"
            return 1
        }

        # Wait for health check
        if (Wait-ForHealthy) {
            # Start monitoring watcher (auto-start for UI triggers)
            $watcherEnabled = $false
            Write-Host ""
            Write-Info "Starting monitoring auto-start watcher..."
            $watcherScript = Join-Path $SCRIPT_DIR "scripts\monitoring-watcher.ps1"
            if (Test-Path $watcherScript) {
                try {
                    & $watcherScript -Start | Out-Null
                    $watcherEnabled = $true
                    Write-Success "Watcher started - UI monitoring buttons will work automatically"
                } catch {
                    Write-Warning "Failed to start watcher: $_"
                    $watcherEnabled = $false
                }
            }
            
            # Start monitoring if requested
            $monitoringStarted = $false
            if ($WithMonitoring) {
                Write-Host ""
                Write-Info "Starting monitoring stack..."
                if (Start-MonitoringStack -GrafanaPortOverride $GrafanaPort) {
                    $monitoringStarted = $true
                } else {
                    Write-Warning "Failed to start monitoring stack, but main application is running"
                }
            }
            
            Show-AccessInfo -MonitoringEnabled $monitoringStarted -WatcherEnabled $watcherEnabled | Out-Null
            return 0
        } else {
            Write-Error-Message "Application did not start properly"
            Write-Info "Check logs with: .\RUN.ps1 -Logs"
            return 1
        }
    } finally {
        Pop-Location
    }

    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Show help
if ($Help) {
    Show-Help
    Exit-Script -Code 0 -SkipPause
}

# Handle commands
if ($Status) {
    $statusCode = Show-Status
    Exit-Script -Code $statusCode
}

if ($Stop) {
    $stopCode = Stop-Application
    Exit-Script -Code $stopCode
}

if ($Logs) {
    $logCode = Show-Logs
    Exit-Script -Code $logCode -SkipPause
}

if ($Backup) {
    Write-Header "Manual Database Backup"
    if (Backup-Database -Reason "manual") {
        Write-Host ""
        Write-Success "Backup completed"
        Write-Info "Backups location: $BACKUPS_DIR"

        # List recent backups
        $backups = Get-ChildItem -Path $BACKUPS_DIR -Filter "sms_backup_*.db" |
                   Sort-Object LastWriteTime -Descending |
                   Select-Object -First 5

        if ($backups) {
            Write-Host "`nRecent backups:" -ForegroundColor Cyan
            foreach ($backupFile in $backups) {
                $size = "{0:N2}" -f ($backupFile.Length / 1MB)
                Write-Host "  • $($backupFile.Name) (${size} MB)" -ForegroundColor White
            }
        }
        Exit-Script -Code 0
    } else {
        Write-Error-Message "Backup failed"
        Exit-Script -Code 1
    }
}

if ($Prune -or $PruneAll) {
    $code = Prune-DockerResources -All:$PruneAll
    Exit-Script -Code $code -OfferStop
}

if (($Update -and $UpdateNoCache) -or ($FastUpdate -and $UpdateNoCache)) {
    Write-Error-Message "Cannot combine -Update / -FastUpdate with -UpdateNoCache. Choose one update mode."
    Exit-Script -Code 1
}

if ($FastUpdate -and -not $Update) {
    Write-Warning "-FastUpdate is deprecated. Use -Update instead. Proceeding with fast update..."
    $Update = $true
}

if ($UpdateNoCache) {
    $cleanCode = CleanUpdate-Application
    Exit-Script -Code $cleanCode -OfferStop
}

if ($Update) {
    $fastCode = FastUpdate-Application
    Exit-Script -Code $fastCode -OfferStop
}

# Default: Start
$startCode = Start-Application
Exit-Script -Code $startCode -OfferStop
