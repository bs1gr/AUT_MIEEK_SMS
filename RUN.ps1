<#
.SYNOPSIS
    Student Management System - One-Click Deployment Script

.DESCRIPTION
    Simple entry point for end users to start, stop, update, and manage the SMS application.
    Uses fullstack Docker container for single-command deployment.

.PARAMETER Update
    Update to latest version with automatic backup

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
    [switch]$Stop,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Backup,
    [switch]$Help
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
$PORT = 8080
$INTERNAL_PORT = 8000
$VOLUME_NAME = "sms_data"

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
    exit 1
}

# Ctrl+C handler for graceful shutdown
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host "`n`n🛑 Interrupt received. Stopping gracefully..." -ForegroundColor Yellow

    $CONTAINER_NAME = "sms-app"
    $running = docker ps -q -f name=$CONTAINER_NAME 2>$null
    if ($running) {
        Write-Host "Stopping container..." -ForegroundColor Yellow
        docker stop $CONTAINER_NAME 2>$null | Out-Null
        Write-Host "✅ Container stopped cleanly" -ForegroundColor Green
    }
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
        $newBackupPath = Join-Path $BACKUPS_DIR $newBackupName
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
    Write-Host ""
    Write-Host "  Useful Commands:" -ForegroundColor Yellow
    Write-Host "    .\RUN.ps1 -Stop      " -NoNewline -ForegroundColor White
    Write-Host "→ Stop the application" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Update    " -NoNewline -ForegroundColor White
    Write-Host "→ Update with backup" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Logs      " -NoNewline -ForegroundColor White
    Write-Host "→ View logs" -ForegroundColor DarkGray
    Write-Host "    .\RUN.ps1 -Status    " -NoNewline -ForegroundColor White
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
    Write-Host "  (no options)  Start the application (default)"
    Write-Host "  -Status       Check if application is running"
    Write-Host "  -Stop         Stop the application cleanly"
    Write-Host "  -Update       Update to latest version (with backup)"
    Write-Host "  -Logs         Show application logs"
    Write-Host "  -Backup       Create manual database backup"
    Write-Host "  -Help         Show this help message`n"
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\RUN.ps1           # Start SMS"
    Write-Host "  .\RUN.ps1 -Status   # Check if running"
    Write-Host "  .\RUN.ps1 -Update   # Update with backup"
    Write-Host "  .\RUN.ps1 -Stop     # Stop SMS`n"
}

function Show-Status {
    Write-Header "SMS Application Status"

    # Check Docker
    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        Write-Info "Please install Docker Desktop and try again"
        exit 1
    }
    Write-Success "Docker is available"

    # Check container
    $status = Get-ContainerStatus
    if (-not $status) {
        Write-Info "SMS is not running"
        Write-Host "`nTo start: .\RUN.ps1`n" -ForegroundColor Yellow
        exit 0
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
    Write-Host ""
}

function Stop-Application {
    Write-Header "Stopping SMS Application"

    $status = Get-ContainerStatus
    if (-not $status) {
        Write-Info "SMS is not running"
        exit 0
    }

    if (-not $status.IsRunning) {
        Write-Info "SMS is already stopped"
        Write-Info "Removing stopped container..."
        docker rm $CONTAINER_NAME 2>$null | Out-Null
        Write-Success "Cleaned up"
        exit 0
    }

    Write-Info "Stopping container..."
    docker stop $CONTAINER_NAME 2>$null | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Success "SMS stopped successfully"
    } else {
        Write-Error-Message "Failed to stop SMS"
        exit 1
    }
}

function Show-Logs {
    $status = Get-ContainerStatus
    if (-not $status -or -not $status.IsRunning) {
        Write-Error-Message "SMS is not running"
        Write-Info "Start it with: .\RUN.ps1"
        exit 1
    }

    Write-Header "SMS Application Logs"
    Write-Info "Press Ctrl+C to stop viewing logs`n"
    docker logs -f --tail 100 $CONTAINER_NAME
}

function Update-Application {
    Write-Header "Updating SMS Application"

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
        exit 1
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
    Write-Info "Building latest version..."
    Write-Info "This may take a few minutes..."
    Write-Host ""

    docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Build failed"
        Write-Info "Check your Docker configuration and try again"

        if ($wasRunning) {
            Write-Host ""
            Write-Info "Restoring previous version..."
            # Start will use the old image
            Start-Application
        }
        exit 1
    }

    Write-Success "Build completed"

    # Start with new image
    Write-Host ""
    Write-Info "Starting updated version..."
    Start-Application

    Write-Host ""
    Write-Success "Update completed successfully!"
    Write-Info "Backup saved in: $BACKUPS_DIR"
}

function Start-Application {
    Write-Header "Starting SMS Application"

    # Check Docker
    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    }

    # Check if already running
    $status = Get-ContainerStatus
    if ($status -and $status.IsRunning) {
        if ($status.IsHealthy) {
            Write-Success "SMS is already running!"
            Show-AccessInfo
            exit 0
        } else {
            Write-Info "SMS is starting up..."
            if (Wait-ForHealthy) {
                Show-AccessInfo
                exit 0
            } else {
                Write-Error-Message "Failed to start properly"
                Write-Info "Check logs with: .\RUN.ps1 -Logs"
                exit 1
            }
        }
    }

    # Check if image exists
    $imageExists = docker images -q $IMAGE_TAG 2>$null
    if (-not $imageExists) {
        Write-Info "First-time setup detected"
        Write-Info "Building Docker image (this may take 5-10 minutes)..."
        Write-Host ""

        docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | ForEach-Object {
            if ($_ -match '(Step \d+/\d+|Successfully built|Successfully tagged)') {
                Write-Host $_ -ForegroundColor DarkGray
            }
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Build failed"
            Write-Info "Please check your Docker configuration and try again"
            exit 1
        }

        Write-Success "Build completed"
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

    docker run -d `
        --name $CONTAINER_NAME `
        -p ${PORT}:${INTERNAL_PORT} `
        -e SMS_ENV=production `
        -e SMS_EXECUTION_MODE=docker `
        -e SECRET_KEY=$envSecret `
        -e DATABASE_URL=sqlite:////app/data/student_management.db `
        -v ${VOLUME_NAME}:/app/data `
        -v "${SCRIPT_DIR}/templates:/app/templates:ro" `
        --restart unless-stopped `
        $IMAGE_TAG 2>$null | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Failed to start container"
        Write-Info "Check Docker logs for details"
        exit 1
    }

    # Wait for health check
    if (Wait-ForHealthy) {
        Show-AccessInfo
    } else {
        Write-Error-Message "Application did not start properly"
        Write-Info "Check logs with: .\RUN.ps1 -Logs"
        exit 1
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Show help
if ($Help) {
    Show-Help
    exit 0
}

# Handle commands
if ($Status) {
    Show-Status
    exit 0
}

if ($Stop) {
    Stop-Application
    exit 0
}

if ($Logs) {
    Show-Logs
    exit 0
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
    } else {
        Write-Error-Message "Backup failed"
        exit 1
    }
    exit 0
}

if ($Update) {
    Update-Application
    exit 0
}

# Default: Start
Start-Application
