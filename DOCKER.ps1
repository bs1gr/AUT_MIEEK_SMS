<#
.SYNOPSIS
    Student Management System - Docker Deployment & Management

.DESCRIPTION
    Complete Docker deployment script for SMS. Handles:
    - First-time installation with prerequisite checks
    - Start/Stop/Restart application
    - Fast & clean updates with automatic backups
    - Monitoring stack (Prometheus, Grafana)
    - Database backups
    - Docker cleanup & maintenance
    - Health checks and logging

.PARAMETER Install
    First-time installation (checks Docker, creates env files, builds image)

.PARAMETER Start
    Start the application (builds image if needed)

.PARAMETER Stop
    Stop the application cleanly

.PARAMETER Restart
    Restart the application

.PARAMETER Update
    Fast update (cached build + backup)

.PARAMETER UpdateClean
    Clean update (no-cache build + backup)

.PARAMETER Status
    Check application status

.PARAMETER Logs
    Show application logs (follow mode)

.PARAMETER Backup
    Create manual database backup

.PARAMETER WithMonitoring
    Start with monitoring stack (Grafana, Prometheus)

.PARAMETER StopMonitoring
    Stop monitoring stack only

.PARAMETER Prune
    Prune Docker caches and old images (safe)

.PARAMETER PruneAll
    Prune caches, images, and unused networks

.PARAMETER DeepClean
    Deep cleanup: remove ALL Docker build cache, containers, images (keeps volumes)

.PARAMETER Help
    Show this help message

.EXAMPLE
    .\DOCKER.ps1 -Install
    # First-time installation

.EXAMPLE
    .\DOCKER.ps1 -Start
    # Start application (builds if needed)

.EXAMPLE
    .\DOCKER.ps1 -Update
    # Fast update with backup

.EXAMPLE
    .\DOCKER.ps1 -Stop
    # Stop cleanly

.NOTES
    Version: 2.0.0 (Consolidated from RUN.ps1, SMS.ps1, INSTALL.ps1, SUPER_CLEAN_AND_DEPLOY.ps1)
    For native development mode, use: .\NATIVE.ps1
#>

param(
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Update,
    [switch]$UpdateClean,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Backup,
    [switch]$WithMonitoring,
    [switch]$StopMonitoring,
    [switch]$Prune,
    [switch]$PruneAll,
    [switch]$DeepClean,
    [switch]$Help,
    [switch]$NoPause,
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
$MIN_DOCKER_VERSION = [version]"20.10.0"
$MIN_POWERSHELL_VERSION = [version]"5.1"

# Read version
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
$ROOT_ENV = Join-Path $SCRIPT_DIR ".env"
$ROOT_ENV_EXAMPLE = Join-Path $SCRIPT_DIR ".env.example"
$BACKEND_ENV = Join-Path $SCRIPT_DIR "backend\.env"
$BACKEND_ENV_EXAMPLE = Join-Path $SCRIPT_DIR "backend\.env.example"

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

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
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

function Get-DockerVersion {
    try {
        $versionOutput = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }

        if ($versionOutput -match 'Docker version (\d+\.\d+\.\d+)') {
            return [version]$matches[1]
        }
        return $null
    } catch {
        return $null
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

function Initialize-EnvironmentFiles {
    Write-Info "Checking environment configuration..."

    $configured = $false
    $secretKey = -join ((48..57) + (65..90) + (97..122) + (45,95) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

    # Root .env
    if (-not (Test-Path $ROOT_ENV)) {
        if (Test-Path $ROOT_ENV_EXAMPLE) {
            Write-Info "Creating root .env from template..."
            $envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
            $envContent = $envContent -replace 'VERSION=.*', "VERSION=$VERSION"
            Set-Content -Path $ROOT_ENV -Value $envContent
            Write-Success "Root .env created with secure SECRET_KEY"
            $configured = $true
        } else {
            Write-Warning ".env.example not found, creating minimal .env..."
            $minimalEnv = @"
VERSION=$VERSION
SECRET_KEY=$secretKey
AUTH_ENABLED=True
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_FULL_NAME=System Administrator
DEFAULT_ADMIN_FORCE_RESET=False
"@
            Set-Content -Path $ROOT_ENV -Value $minimalEnv
            Write-Success "Minimal .env created"
            $configured = $true
        }
    } else {
        # Verify SECRET_KEY is secure
        $rootContent = Get-Content $ROOT_ENV -Raw
        if ($rootContent -match 'SECRET_KEY=(.+)') {
            $existingKey = $matches[1].Trim()
            if ($existingKey.Length -lt 32 -or $existingKey.ToLower().Contains("change")) {
                Write-Warning "Insecure SECRET_KEY detected, updating..."
                $rootContent = $rootContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
                Set-Content -Path $ROOT_ENV -Value $rootContent
                Write-Success "SECRET_KEY updated"
                $configured = $true
            } else {
                $secretKey = $existingKey
            }
        }
    }

    # Backend .env
    if (-not (Test-Path $BACKEND_ENV)) {
        if (Test-Path $BACKEND_ENV_EXAMPLE) {
            Write-Info "Creating backend .env from template..."
            $envContent = Get-Content $BACKEND_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=your-secret-key-change-this-in-production.*', "SECRET_KEY=$secretKey"
            Set-Content -Path $BACKEND_ENV -Value $envContent
            Write-Success "Backend .env created with matching SECRET_KEY"
            $configured = $true
        }
    } else {
        # Verify SECRET_KEY matches
        $backendContent = Get-Content $BACKEND_ENV -Raw
        if ($backendContent -match 'SECRET_KEY=(.+)') {
            $existingKey = $matches[1].Trim()
            if ($existingKey.Length -lt 32 -or $existingKey.ToLower().Contains("change")) {
                Write-Warning "Updating backend SECRET_KEY to match..."
                $backendContent = $backendContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
                Set-Content -Path $BACKEND_ENV -Value $backendContent
                Write-Success "Backend SECRET_KEY updated"
                $configured = $true
            }
        }
    }

    if ($configured) {
        Write-Host ""
        Write-Info "Default admin credentials:"
        Write-Host "  Email:    admin@example.com" -ForegroundColor White
        Write-Host "  Password: YourSecurePassword123!" -ForegroundColor White
        Write-Warning "Change password after first login in Control Panel → Maintenance"
        Write-Host ""
    }

    return $true
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

    if (-not (Test-Path $BACKUPS_DIR)) {
        New-Item -ItemType Directory -Path $BACKUPS_DIR -Force | Out-Null
    }

    # Check if volume exists and has data
    $volumeExists = docker volume inspect $VOLUME_NAME 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Volume '$VOLUME_NAME' does not exist yet - skipping backup (fresh installation)"
        return $true  # Not an error for fresh installs
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "sms_backup_${timestamp}.db"
    $backupPath = Join-Path $BACKUPS_DIR $backupName

    try {
        $containerStatus = Get-ContainerStatus

        if ($containerStatus -and $containerStatus.IsRunning) {
            Write-Info "Backing up from running container..."
            # Check if database file exists first
            $dbExists = docker exec $CONTAINER_NAME test -f /app/data/student_management.db 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "No database file found - skipping backup (fresh installation)"
                return $true  # Not an error for fresh installs
            }
            docker exec $CONTAINER_NAME sh -c "cp /app/data/student_management.db /app/data/backup_temp.db" 2>$null
            docker cp "${CONTAINER_NAME}:/app/data/backup_temp.db" $backupPath 2>$null
            docker exec $CONTAINER_NAME sh -c "rm -f /app/data/backup_temp.db" 2>$null
        } else {
            Write-Info "Backing up from Docker volume..."
            # Check if database exists in volume first
            $dbCheck = docker run --rm `
                -v ${VOLUME_NAME}:/data:ro `
                alpine:latest `
                test -f /data/student_management.db 2>$null
            
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "No database file in volume - skipping backup (fresh installation)"
                return $true  # Not an error for fresh installs
            }

            docker run --rm `
                -v ${VOLUME_NAME}:/data:ro `
                -v "${BACKUPS_DIR}:/backups" `
                alpine:latest `
                sh -c "cp /data/student_management.db /backups/${backupName}" 2>$null
        }

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $backupPath)) {
            Write-Warning "Backup failed (may be first installation with no data yet)"
            return $true  # Don't fail the update for backup issues on fresh installs
        }

        $backupSize = (Get-Item $backupPath).Length
        if ($backupSize -lt 1KB) {
            Write-Warning "Backup file too small or empty (may be fresh installation)"
            Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
            return $true  # Don't fail the update
        }

        $hash = (Get-FileHash -Path $backupPath -Algorithm SHA256).Hash.Substring(0, 8)
        $newBackupName = "sms_backup_${timestamp}_${hash}.db"
        Rename-Item -Path $backupPath -NewName $newBackupName -Force

        Write-Success "Backup created: $newBackupName ($('{0:N2}' -f ($backupSize / 1MB)) MB)"

        # Cleanup old backups
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
    param([int]$TimeoutSeconds = 60)

    Write-Info "Waiting for application to start..."

    $elapsed = 0
    $checkInterval = 2

    while ($elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval

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
            Write-Info "Check logs with: .\DOCKER.ps1 -Logs"
            return $false
        }

        Write-Host "." -NoNewline
    }

    Write-Host "`n"
    Write-Error-Message "Timeout waiting for application"
    Write-Info "Check status: .\DOCKER.ps1 -Status"
    Write-Info "View logs: .\DOCKER.ps1 -Logs"
    return $false
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

function Start-MonitoringStack {
    param([int]$GrafanaPortOverride = $DEFAULT_GRAFANA_PORT)
    
    Write-Info "Starting monitoring stack..."
    
    $actualGrafanaPort = $GrafanaPortOverride
    if (Test-PortInUse -Port $actualGrafanaPort) {
        Write-Warning "Port $actualGrafanaPort is already in use"
        $availablePort = Find-AvailablePort -StartPort $actualGrafanaPort
        
        if ($null -eq $availablePort) {
            Write-Error-Message "Could not find available port for Grafana"
            return $false
        }
        
        $actualGrafanaPort = $availablePort
        Write-Info "Using alternative port for Grafana: $actualGrafanaPort"
    }
    
    Push-Location $SCRIPT_DIR
    try {
        $env:GRAFANA_PORT = $actualGrafanaPort
        docker compose -f $MONITORING_COMPOSE_FILE up -d 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to start monitoring stack"
            return $false
        }
        
        Write-Success "Monitoring stack started"
        Write-Host ""
        Write-Host "  📊 Grafana:    http://localhost:$actualGrafanaPort (admin/admin)" -ForegroundColor Cyan
        Write-Host "  🔍 Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor Cyan
        Write-Host ""
        
        return $true
    }
    finally {
        Pop-Location
    }
}

function Stop-MonitoringStack {
    Write-Info "Stopping monitoring stack..."
    
    Push-Location $SCRIPT_DIR
    try {
        docker compose -f $MONITORING_COMPOSE_FILE down 2>$null | Out-Null
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

function Prune-DockerResources {
    param([switch]$All, [switch]$Deep)

    Write-Header "Docker Cleanup"

    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        return 1
    }

    try {
        if ($Deep) {
            Write-Warning "Deep cleanup will remove ALL Docker build cache, stopped containers, and unused images"
            Write-Warning "This is safe but will require rebuilding images from scratch"
            Write-Host ""
            $confirm = Read-Host "Continue? (yes/no)"
            if ($confirm -ne "yes") {
                Write-Info "Cleanup cancelled"
                return 0
            }

            Write-Info "Stopping all SMS containers..."
            docker stop $CONTAINER_NAME 2>$null | Out-Null
            docker rm $CONTAINER_NAME 2>$null | Out-Null

            Write-Info "Removing ALL build cache..."
            docker builder prune -af 2>$null | Out-Null

            Write-Info "Removing ALL stopped containers..."
            docker container prune -f 2>$null | Out-Null

            Write-Info "Removing ALL unused images..."
            docker image prune -af 2>$null | Out-Null

            Write-Info "Removing unused networks..."
            docker network prune -f 2>$null | Out-Null

            Write-Success "Deep cleanup completed"
            Write-Warning "Volume '$VOLUME_NAME' preserved (contains your data)"
        } else {
            Write-Info "Pruning stopped containers..."
            docker container prune -f 2>$null | Out-Null

            Write-Info "Pruning dangling images..."
            docker image prune -f 2>$null | Out-Null

            Write-Info "Pruning build cache..."
            docker builder prune -af --filter "until=1h" 2>$null | Out-Null

            if ($All) {
                Write-Info "Pruning unused networks..."
                docker network prune -f 2>$null | Out-Null
            }

            Write-Success "Docker cleanup completed"
        }

        return 0
    }
    catch {
        Write-Error-Message "Cleanup failed: $_"
        return 1
    }
}

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

function Show-Help {
    Write-Header "SMS Docker Management - Help"
    Write-Host @"
USAGE:
  .\DOCKER.ps1 [COMMAND]

COMMANDS:
  -Install          First-time installation (checks Docker, creates env, builds image)
  -Start            Start application (default, builds if needed)
  -Stop             Stop application cleanly
  -Restart          Restart application
  -Update           Fast update (cached build + backup)
  -UpdateClean      Clean update (no-cache build + backup)
  -Status           Show application status
  -Logs             View application logs (follow mode)
  -Backup           Create manual database backup

MONITORING:
  -WithMonitoring   Start with monitoring stack (Grafana, Prometheus)
  -StopMonitoring   Stop monitoring stack only

MAINTENANCE:
  -Prune            Safe cleanup (stopped containers, cache, dangling images)
  -PruneAll         Safe cleanup + unused networks
  -DeepClean        Deep cleanup (removes ALL cache, requires rebuild)

EXAMPLES:
  .\DOCKER.ps1 -Install              # First-time setup
  .\DOCKER.ps1 -Start                # Start (default)
  .\DOCKER.ps1 -WithMonitoring       # Start with monitoring
  .\DOCKER.ps1 -Update               # Fast update
  .\DOCKER.ps1 -UpdateClean          # Clean update
  .\DOCKER.ps1 -Stop                 # Stop
  .\DOCKER.ps1 -Prune                # Cleanup
  .\DOCKER.ps1 -DeepClean            # Deep cleanup

ACCESS:
  Web Interface:  http://localhost:$PORT
  API Docs:       http://localhost:${PORT}/docs
  Control Panel:  http://localhost:${PORT}/control

For native development mode, use: .\NATIVE.ps1

"@
}

function Start-Installation {
    Write-Header "SMS Docker Installation"

    # Check prerequisites
    Write-Info "Checking prerequisites..."

    if (-not (Test-Administrator)) {
        Write-Warning "Not running as Administrator"
        Write-Info "Some operations may require elevated privileges"
    }

    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion -lt $MIN_POWERSHELL_VERSION) {
        Write-Error-Message "PowerShell $MIN_POWERSHELL_VERSION or higher required (found $psVersion)"
        return 1
    }
    Write-Success "PowerShell $psVersion"

    # Check Docker
    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        Write-Info "After installation, restart and run: .\DOCKER.ps1 -Install"
        return 1
    }

    $dockerVersion = Get-DockerVersion
    if ($dockerVersion -lt $MIN_DOCKER_VERSION) {
        Write-Warning "Docker version $dockerVersion is older than recommended $MIN_DOCKER_VERSION"
    } else {
        Write-Success "Docker $dockerVersion"
    }

    # Initialize environment files
    Write-Host ""
    if (-not (Initialize-EnvironmentFiles)) {
        Write-Error-Message "Environment setup failed"
        return 1
    }

    # Create directories
    Write-Host ""
    Write-Info "Creating application directories..."
    $directories = @(
        (Join-Path $SCRIPT_DIR "data"),
        (Join-Path $SCRIPT_DIR "data\.triggers"),
        (Join-Path $SCRIPT_DIR "backups"),
        (Join-Path $SCRIPT_DIR "logs")
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Created: $($dir.Replace($SCRIPT_DIR, '.'))"
        }
    }

    # Create Docker volume
    Write-Host ""
    Write-Info "Creating Docker volume..."
    $existingVolume = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $VOLUME_NAME }
    if ($existingVolume) {
        Write-Info "Volume '$VOLUME_NAME' already exists"
    } else {
        docker volume create $VOLUME_NAME 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Volume '$VOLUME_NAME' created"
        } else {
            Write-Error-Message "Failed to create Docker volume"
            return 1
        }
    }

    # Build image
    Write-Host ""
    Write-Info "Building Docker image (this may take 5-10 minutes)..."
    Write-Info "Image tag: $IMAGE_TAG"

    Push-Location $SCRIPT_DIR
    try {
        docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | ForEach-Object {
            if ($_ -match '(Step \d+/\d+|Successfully built|Successfully tagged)') {
                Write-Host $_ -ForegroundColor DarkGray
            }
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Build failed"
            return 1
        }

        Write-Success "Build completed: $IMAGE_TAG"
    } finally {
        Pop-Location
    }

    # Installation complete
    Write-Host ""
    Write-Header "Installation Complete!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Start application:  .\DOCKER.ps1 -Start" -ForegroundColor White
    Write-Host "  2. Access web app:     http://localhost:$PORT" -ForegroundColor White
    Write-Host "  3. Login:              admin@example.com / YourSecurePassword123!" -ForegroundColor White
    Write-Host "  4. Change password:    Control Panel → Maintenance" -ForegroundColor White
    Write-Host ""

    $startNow = Read-Host "Start application now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($startNow) -or $startNow -match '^[Yy]') {
        return Start-Application
    }

    return 0
}

function Start-Application {
    Write-Header "Starting SMS Application"

    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        return 1
    }

    # Check if already running
    $status = Get-ContainerStatus
    if ($status -and $status.IsRunning) {
        if ($status.IsHealthy) {
            Write-Success "SMS is already running!"
            Show-AccessInfo -MonitoringEnabled:$WithMonitoring
            return 0
        } else {
            Write-Info "SMS is starting up..."
            if (Wait-ForHealthy) {
                Show-AccessInfo -MonitoringEnabled:$WithMonitoring
                return 0
            } else {
                return 1
            }
        }
    }

    # Check if image exists
    $imageExists = docker images -q $IMAGE_TAG 2>$null
    if (-not $imageExists) {
        Write-Info "Image not found, building..."
        Write-Info "This may take 5-10 minutes on first run..."

        Push-Location $SCRIPT_DIR
        try {
            docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | Out-Null

            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Build failed"
                return 1
            }

            Write-Success "Build completed"
        } finally {
            Pop-Location
        }
    }

    # Remove stopped container if exists
    if ($status -and -not $status.IsRunning) {
        docker rm $CONTAINER_NAME 2>$null | Out-Null
    }

    # Initialize env files
    Initialize-EnvironmentFiles | Out-Null

    # Start container
    Write-Info "Starting container..."

    # Build docker run command with env-file if available
    $dockerCmd = @(
        "run", "-d",
        "--name", $CONTAINER_NAME,
        "-p", "${PORT}:${INTERNAL_PORT}"
    )
    
    if (Test-Path $ROOT_ENV) {
        $dockerCmd += "--env-file"
        $dockerCmd += $ROOT_ENV
    }
    
    $dockerCmd += @(
        "-e", "SMS_ENV=production",
        "-e", "SMS_EXECUTION_MODE=docker",
        "-e", "TZ=Europe/Athens",
        "-v", "${VOLUME_NAME}:/data",
        "-v", "${SCRIPT_DIR}/templates:/app/templates:ro",
        "-v", "${SCRIPT_DIR}/backups:/app/backups",
        "--restart", "unless-stopped",
        $IMAGE_TAG
    )

    & docker $dockerCmd 2>$null | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Failed to start container"
        return 1
    }

    # Wait for health check
    if (Wait-ForHealthy) {
        if ($WithMonitoring) {
            Write-Host ""
            Start-MonitoringStack -GrafanaPortOverride $GrafanaPort | Out-Null
        }

        Show-AccessInfo -MonitoringEnabled:$WithMonitoring
        return 0
    } else {
        return 1
    }
}

function Stop-Application {
    Write-Header "Stopping SMS Application"

    $status = Get-ContainerStatus
    if (-not $status -or -not $status.IsRunning) {
        Write-Info "SMS is not running"

        # Stop monitoring if running
        $monStatus = Get-MonitoringStatus
        if ($monStatus.IsRunning) {
            Stop-MonitoringStack | Out-Null
        }

        return 0
    }

    Write-Info "Stopping container..."
    docker stop $CONTAINER_NAME 2>$null | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Success "SMS stopped successfully"
    } else {
        Write-Error-Message "Failed to stop SMS"
        return 1
    }

    # Stop monitoring if running
    $monStatus = Get-MonitoringStatus
    if ($monStatus.IsRunning) {
        Write-Host ""
        $response = Read-Host "Stop monitoring stack too? (Y/n)"
        if ([string]::IsNullOrWhiteSpace($response) -or $response -match '^[Yy]') {
            Stop-MonitoringStack | Out-Null
        }
    }

    return 0
}

function Restart-Application {
    Write-Header "Restarting SMS Application"

    $stopResult = Stop-Application
    if ($stopResult -ne 0) {
        return $stopResult
    }

    Start-Sleep -Seconds 2
    return Start-Application
}

function Show-Status {
    Write-Header "SMS Application Status"

    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        return 1
    }
    Write-Success "Docker is available"

    $status = Get-ContainerStatus
    if (-not $status) {
        Write-Info "SMS is not running"
        Write-Host "`nTo start: .\DOCKER.ps1 -Start`n" -ForegroundColor Yellow
        return 0
    }

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

        Write-Host "`n📱 Web Interface: http://localhost:$PORT" -ForegroundColor Green
    }

    # Check monitoring
    $monStatus = Get-MonitoringStatus
    if ($monStatus.IsRunning) {
        Write-Host "`nMonitoring: " -NoNewline -ForegroundColor Cyan
        Write-Host "Running ✅" -ForegroundColor Green
        Write-Host "  Grafana:    http://localhost:$GrafanaPort" -ForegroundColor White
        Write-Host "  Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor White
    }

    Write-Host ""
    return 0
}

function Show-Logs {
    $status = Get-ContainerStatus
    if (-not $status -or -not $status.IsRunning) {
        Write-Error-Message "SMS is not running"
        return 1
    }

    Write-Header "SMS Application Logs"
    Write-Info "Press Ctrl+C to stop viewing logs`n"
    docker logs -f --tail 100 $CONTAINER_NAME
    return $LASTEXITCODE
}

function Update-Application {
    param([switch]$Clean)

    Write-Header "Updating SMS Application"

    $status = Get-ContainerStatus
    $wasRunning = $status -and $status.IsRunning

    # Create backup (non-fatal for fresh installations)
    Write-Host ""
    $backupSuccess = Backup-Database -Reason "before-update"
    if (-not $backupSuccess) {
        Write-Warning "Backup skipped or failed - continuing with update"
        Write-Info "This is normal for fresh installations with no existing data"
    }

    # Stop if running
    if ($wasRunning) {
        Write-Host ""
        Write-Info "Stopping current version..."
        docker stop $CONTAINER_NAME 2>$null | Out-Null
        docker rm $CONTAINER_NAME 2>$null | Out-Null
    }

    # Build
    Write-Host ""
    if ($Clean) {
        Write-Info "Clean rebuild (no cache)..."
        Prune-DockerResources -All | Out-Null
        $buildArgs = @("build", "--pull", "--no-cache", "-t", $IMAGE_TAG, "-f", "docker/Dockerfile.fullstack", ".")
    } else {
        Write-Info "Fast rebuild (cached)..."
        $buildArgs = @("build", "--pull", "-t", $IMAGE_TAG, "-f", "docker/Dockerfile.fullstack", ".")
    }

    Push-Location $SCRIPT_DIR
    try {
        & docker @buildArgs 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Build failed"
            return 1
        }

        Write-Success "Build completed"
    } finally {
        Pop-Location
    }

    # Start
    Write-Host ""
    $startResult = Start-Application
    if ($startResult -eq 0) {
        Write-Host ""
        Write-Success "Update completed successfully!"
    }

    return $startResult
}

function Show-AccessInfo {
    param([bool]$MonitoringEnabled = $false)
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                 🎉 SMS is now running! 🎉                    ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📱 Web Interface:  http://localhost:$PORT" -ForegroundColor Cyan
    Write-Host "  📊 API Docs:       http://localhost:${PORT}/docs" -ForegroundColor Cyan
    Write-Host "  🏥 Health Check:   http://localhost:${PORT}/health" -ForegroundColor Cyan
    
    if ($MonitoringEnabled) {
        $monStatus = Get-MonitoringStatus
        if ($monStatus.IsRunning) {
            Write-Host ""
            Write-Host "  Monitoring:" -ForegroundColor Yellow
            Write-Host "    📊 Grafana:    http://localhost:$GrafanaPort" -ForegroundColor Cyan
            Write-Host "    🔍 Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "  Quick Commands:" -ForegroundColor Yellow
    Write-Host "    .\DOCKER.ps1 -Stop    → Stop application" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Update  → Update application" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Logs    → View logs" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Status  → Check status" -ForegroundColor White
    Write-Host ""
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
if ($Install) {
    $code = Start-Installation
    exit $code
}

if ($Status) {
    $code = Show-Status
    exit $code
}

if ($Stop) {
    $code = Stop-Application
    exit $code
}

if ($Restart) {
    $code = Restart-Application
    exit $code
}

if ($Logs) {
    $code = Show-Logs
    exit $code
}

if ($Backup) {
    Write-Header "Manual Database Backup"
    if (Backup-Database -Reason "manual") {
        Write-Success "Backup completed"
        Write-Info "Location: $BACKUPS_DIR"

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
        exit 0
    } else {
        Write-Error-Message "Backup failed"
        exit 1
    }
}

if ($StopMonitoring) {
    $code = if (Stop-MonitoringStack) { 0 } else { 1 }
    exit $code
}

if ($Prune -or $PruneAll -or $DeepClean) {
    $code = Prune-DockerResources -All:$PruneAll -Deep:$DeepClean
    exit $code
}

if ($Update) {
    $code = Update-Application
    exit $code
}

if ($UpdateClean) {
    $code = Update-Application -Clean
    exit $code
}

# Default: Start with monitoring if requested
if ($WithMonitoring) {
    $Start = $true
}

# Default: Start
$code = Start-Application
exit $code
