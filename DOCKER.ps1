param(
    $GrafanaPort = 3000,
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
    [switch]$Silent,  # Unattended mode: skip prompts (for installer integration)
    [switch]$NoShortcut  # Skip desktop shortcut creation (for installer integration)
)

# Robustly initialize $SCRIPT_DIR and $INSTALLER_LOG at the very top
if (-not (Get-Variable -Name SCRIPT_DIR -Scope Script -ErrorAction SilentlyContinue)) {
    $SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$INSTALLER_LOG = Join-Path $SCRIPT_DIR "DOCKER_INSTALL.log"

function Write-InstallerLog {
    param([string]$Message, [switch]$IsError)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $prefix = if ($IsError) { "[ERROR]" } else { "[INFO]" }
    try {
        Add-Content -Path $INSTALLER_LOG -Value ("[$timestamp] $prefix $Message") -ErrorAction Stop
    } catch {
        # If the log file is temporarily locked, don't fail installation
        # Best-effort logging only
    }
}

function Write-DebugInfo {
    param([string]$Message)
    Write-InstallerLog "[DEBUG] $Message"
    Write-Verbose $Message -Verbose
}
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
Version: 1.18.1 (Consolidated from RUN.ps1, SMS.ps1, INSTALL.ps1, SUPER_CLEAN_AND_DEPLOY.ps1)
    For native development mode, use: .\NATIVE.ps1
#>

if ($Silent) {
    Remove-Item -Path $INSTALLER_LOG -ErrorAction SilentlyContinue
    Write-InstallerLog "--- DOCKER.ps1 started in Silent mode ---"
    Write-InstallerLog "Args: $($MyInvocation.Line)"
}

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$VERSION_FILE = Join-Path $SCRIPT_DIR "VERSION"
$BACKUPS_DIR = Join-Path $SCRIPT_DIR "backups\database"
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
$PORT = 8080
$INTERNAL_PORT = 8000
$VOLUME_NAME = "sms_data"
$MONITORING_COMPOSE_FILE = Join-Path $SCRIPT_DIR "docker\docker-compose.monitoring.yml"
$DEFAULT_GRAFANA_PORT = 3000
$DEFAULT_PROMETHEUS_PORT = 9090
$ROOT_ENV = Join-Path $SCRIPT_DIR ".env"
$ROOT_ENV_EXAMPLE = Join-Path $SCRIPT_DIR ".env.example"
$BACKEND_ENV = Join-Path $SCRIPT_DIR "backend\.env"
$BACKEND_ENV_EXAMPLE = Join-Path $SCRIPT_DIR "backend\.env.example"
$COMPOSE_BASE = Join-Path $SCRIPT_DIR "docker\docker-compose.yml"
$COMPOSE_PROD = Join-Path $SCRIPT_DIR "docker\docker-compose.prod.yml"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "  $($Message.PadRight(48))  " -ForegroundColor Cyan
    Write-Host "==================================================`n" -ForegroundColor Cyan
    if ($Silent) { Write-InstallerLog $Message }
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    if ($Silent) { Write-InstallerLog "SUCCESS: $Message" }
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    if ($Silent) { Write-InstallerLog "ERROR: $Message" }
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
    if ($Silent) { Write-InstallerLog "INFO: $Message" }
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    if ($Silent) { Write-InstallerLog "WARNING: $Message" }
}


function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Start-DockerIfNeeded {
    param(
        [int]$MaxAttempts = 10,
        [int]$DelaySeconds = 3
    )

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    $null = docker ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        return $true
    }

    try {
        Start-Service -Name "com.docker.service" -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Service may not exist in all environments
    }

    $dockerDesktopCandidates = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "C:\Program Files\Docker\Docker\Docker.exe"
    )

    foreach ($candidate in $dockerDesktopCandidates) {
        if (Test-Path $candidate) {
            Start-Process -FilePath $candidate -ErrorAction SilentlyContinue | Out-Null
            break
        }
    }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Start-Sleep -Seconds $DelaySeconds
        $null = docker ps 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    }

    return $false
}

function Test-DockerAvailable {
    try {
        $null = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $false
        }

        if (-not (Start-DockerIfNeeded)) {
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

function Get-DockerVersionString {
    try {
        $versionOutput = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }

        if ($versionOutput -match 'Docker version ([^,]+)') {
            return $matches[1]
        }
        return $versionOutput.Trim()
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

function Test-SecretKeySecure {
    param([string]$Key, [string]$EnvType)

    if ([string]::IsNullOrWhiteSpace($Key)) {
        return $false
    }

    $key_lower = $Key.ToLower()
    $insecure_patterns = @(
        'change',
        'placeholder',
        'your-secret',
        'example',
        'local-dev-secret',
        'dev-placeholder'
    )

    # Check for insecure patterns
    foreach ($pattern in $insecure_patterns) {
        if ($key_lower.Contains($pattern)) {
            Write-Warning "Insecure SECRET_KEY detected: contains '$pattern'"
            return $false
        }
    }

    # Check length (minimum 32 characters for production)
    if ($Key.Length -lt 32) {
        Write-Warning "Insecure SECRET_KEY detected: too short ($($Key.Length) < 32 characters)"
        return $false
    }

    return $true
}

function Get-EnvVarValue {
    param([string]$Name)

    if (-not (Test-Path $ROOT_ENV)) {
        return $null
    }

    $lines = Get-Content $ROOT_ENV -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        if ($line -match "^\s*$Name\s*=\s*(.+?)\s*$") {
            return $matches[1].Trim()
        }
    }

    return $null
}

function Use-ComposeMode {
    $dbUrl = Get-EnvVarValue -Name "DATABASE_URL"
    $dbEngine = Get-EnvVarValue -Name "DATABASE_ENGINE"
    $pgHost = Get-EnvVarValue -Name "POSTGRES_HOST"
    $pgUser = Get-EnvVarValue -Name "POSTGRES_USER"
    $pgPassword = Get-EnvVarValue -Name "POSTGRES_PASSWORD"
    $pgDb = Get-EnvVarValue -Name "POSTGRES_DB"

    if ($dbUrl -and $dbUrl.Trim().ToLower().StartsWith("postgresql")) {
        return $true
    }

    if ($dbEngine -and $dbEngine -match "postgres") {
        return $true
    }

    # IMPORTANT: Do NOT auto-switch to PostgreSQL compose mode only because
    # POSTGRES_* variables exist. Those variables may be present in .env for
    # future/optional use while DATABASE_ENGINE remains sqlite.
    # Switching implicitly causes "missing data" scenarios by pointing the app
    # to a different database engine/volume.
    if ($pgHost -and $pgUser -and $pgPassword -and $pgDb) {
        Write-Warning "POSTGRES_* variables detected, but DATABASE_ENGINE is not postgresql. PostgreSQL is required."
        Write-Info "Set DATABASE_ENGINE=postgresql and DATABASE_URL=postgresql://..."
    }

    return $false
}

function Use-InternalPostgresProfile {
    $dbUrl = Get-EnvVarValue -Name "DATABASE_URL"
    if (-not $dbUrl) {
        return $true
    }
    $normalized = $dbUrl.Trim().ToLower()
    if ($normalized -match '@postgres[:/]' -or $normalized -match '@postgresql[:/]') {
        return $true
    }
    return $false
}

function ConvertTo-UriComponent {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return [System.Uri]::EscapeDataString($Value)
}

function New-PostgresDatabaseUrl {
    param(
        [string]$DbHost,
        [string]$Port,
        [string]$User,
        [string]$Password,
        [string]$Database
    )

    $safeHost = $DbHost
    if (
        $safeHost -and
        $safeHost.Contains(":") -and
        -not ($safeHost.StartsWith("[") -and $safeHost.EndsWith("]"))
    ) {
        $safeHost = "[$safeHost]"
    }

    $encodedUser = ConvertTo-UriComponent -Value $User
    $encodedPassword = ConvertTo-UriComponent -Value $Password
    $encodedDatabase = ConvertTo-UriComponent -Value $Database

    return "postgresql://${encodedUser}:${encodedPassword}@${safeHost}:${Port}/${encodedDatabase}"
}

function Set-ComposeProfileEnvironment {
    if (Use-InternalPostgresProfile) {
        $env:COMPOSE_PROFILES = "internal-postgres"
        return "internal-postgres"
    }

    $env:COMPOSE_PROFILES = ""
    return ""
}

function Resolve-ComposeVolumeName {
    param(
        [string]$DefaultName,
        [string]$LegacySuffix
    )

    $volumeNamesRaw = docker volume ls --format "{{.Name}}" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $volumeNamesRaw) {
        return $DefaultName
    }

    $volumeNames = @(
        $volumeNamesRaw |
            Where-Object { $_ -and -not [string]::IsNullOrWhiteSpace($_) } |
            ForEach-Object { $_.Trim() }
    )

    if ($volumeNames -contains $DefaultName) {
        return $DefaultName
    }

    $legacyCandidates = @($volumeNames | Where-Object { $_ -like "*_${LegacySuffix}" })
    if ($legacyCandidates.Count -eq 1) {
        return $legacyCandidates[0]
    }

    if ($legacyCandidates.Count -gt 1) {
        $ranked = @(
            $legacyCandidates | ForEach-Object {
                $name = $_
                $createdAt = docker volume inspect $name --format "{{.CreatedAt}}" 2>$null
                [PSCustomObject]@{
                    Name = $name
                    CreatedAt = if ($LASTEXITCODE -eq 0) { $createdAt } else { "" }
                }
            }
        ) | Sort-Object CreatedAt -Descending

        if ($ranked.Count -gt 0 -and $ranked[0].Name) {
            return $ranked[0].Name
        }
    }

    return $DefaultName
}

function Set-ComposeVolumeEnvironment {
    if ($script:ComposeVolumeEnvInitialized) {
        return
    }

    Invoke-OneTimeVolumeMigration

    $resolvedSmsData = Resolve-ComposeVolumeName -DefaultName "sms_data" -LegacySuffix "sms_data"
    $resolvedPostgresData = Resolve-ComposeVolumeName -DefaultName "sms_postgres_data" -LegacySuffix "postgres_data"

    $script:SelectedSmsDataVolume = $resolvedSmsData
    $script:SelectedPostgresDataVolume = $resolvedPostgresData

    $env:SMS_DATA_VOLUME = $resolvedSmsData
    $env:POSTGRES_DATA_VOLUME = $resolvedPostgresData

    if ($resolvedSmsData -ne "sms_data") {
        Write-Info "Using existing SMS data volume: $resolvedSmsData"
    }
    if ($resolvedPostgresData -ne "sms_postgres_data") {
        Write-Info "Using existing PostgreSQL data volume: $resolvedPostgresData"
    }

    $script:ComposeVolumeEnvInitialized = $true
}

function Get-VolumeDataSizeBytes {
    param(
        [string]$VolumeName,
        [string]$RelativePath
    )

    $safePath = $RelativePath.TrimStart('/')
    $sizeRaw = docker run --rm -v "${VolumeName}:/volume:ro" alpine:latest sh -c "if [ -f '/volume/$safePath' ]; then wc -c < '/volume/$safePath'; else echo 0; fi" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sizeRaw)) {
        return 0L
    }

    $parsed = 0L
    if ([long]::TryParse(($sizeRaw | Out-String).Trim(), [ref]$parsed)) {
        return $parsed
    }

    return 0L
}

function Test-VolumeHasContent {
    param([string]$VolumeName)

    $probe = docker run --rm -v "${VolumeName}:/volume:ro" alpine:latest sh -c "find /volume -mindepth 1 -print -quit" 2>$null
    return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($probe | Out-String).Trim()))
}

function Copy-VolumeData {
    param(
        [string]$SourceVolume,
        [string]$TargetVolume
    )

    $copyOut = docker run --rm -v "${SourceVolume}:/from:ro" -v "${TargetVolume}:/to" alpine:latest sh -c "cp -a /from/. /to/" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Volume copy failed (${SourceVolume} -> ${TargetVolume}): $($copyOut | Out-String)"
        return $false
    }

    return $true
}

function Invoke-OneTimeVolumeMigration {
    if ($script:VolumeMigrationChecked) {
        return
    }

    if (-not (Test-DockerAvailable)) {
        return
    }

    $legacySmsDataVolumes = @(
        docker volume ls --format "{{.Name}}" 2>$null |
            Where-Object { $_ -and $_ -like "*_sms_data" -and $_ -ne "sms_data" } |
            ForEach-Object { $_.Trim() }
    )

    if (-not (docker volume inspect sms_data 2>$null)) {
        docker volume create sms_data 2>$null | Out-Null
    }

    $targetDbSize = Get-VolumeDataSizeBytes -VolumeName "sms_data" -RelativePath "student_management.db"
    if ($targetDbSize -gt 0) {
        $script:VolumeMigrationChecked = $true
        return
    }

    if ($legacySmsDataVolumes.Count -gt 0) {
        $rankedSources = @(
            $legacySmsDataVolumes | ForEach-Object {
                $name = $_
                $dbSize = Get-VolumeDataSizeBytes -VolumeName $name -RelativePath "student_management.db"
                $createdAt = docker volume inspect $name --format "{{.CreatedAt}}" 2>$null
                [PSCustomObject]@{
                    Name = $name
                    DbSize = $dbSize
                    CreatedAt = if ($LASTEXITCODE -eq 0) { $createdAt } else { "" }
                }
            }
        ) | Sort-Object DbSize, CreatedAt -Descending

        if ($rankedSources.Count -gt 0 -and $rankedSources[0].DbSize -gt 0) {
            $source = $rankedSources[0].Name
            Write-Info "One-time migration: copying SQLite data from legacy volume '$source' to 'sms_data'"
            if (Copy-VolumeData -SourceVolume $source -TargetVolume "sms_data") {
                $migratedSize = Get-VolumeDataSizeBytes -VolumeName "sms_data" -RelativePath "student_management.db"
                if ($migratedSize -gt 0) {
                    Write-Success "One-time migration completed for SQLite volume (source: $source)"
                    $script:LastMigrationSummary = "SQLite: $source -> sms_data"
                } else {
                    Write-Warning "Volume copy completed but target SQLite database is still empty"
                }
            }
        }
    }

    $legacyPgVolumes = @(
        docker volume ls --format "{{.Name}}" 2>$null |
            Where-Object { $_ -and $_ -like "*_postgres_data" -and $_ -ne "sms_postgres_data" } |
            ForEach-Object { $_.Trim() }
    )

    if (-not (docker volume inspect sms_postgres_data 2>$null)) {
        docker volume create sms_postgres_data 2>$null | Out-Null
    }

    $targetPgHasContent = Test-VolumeHasContent -VolumeName "sms_postgres_data"
    if (-not $targetPgHasContent -and $legacyPgVolumes.Count -gt 0) {
        $pgCandidate = @(
            $legacyPgVolumes | ForEach-Object {
                $name = $_
                $createdAt = docker volume inspect $name --format "{{.CreatedAt}}" 2>$null
                [PSCustomObject]@{
                    Name = $name
                    HasContent = Test-VolumeHasContent -VolumeName $name
                    CreatedAt = if ($LASTEXITCODE -eq 0) { $createdAt } else { "" }
                }
            } | Where-Object { $_.HasContent }
        ) | Sort-Object CreatedAt -Descending | Select-Object -First 1

        if ($pgCandidate -and $pgCandidate.Name) {
            Write-Info "One-time migration: copying PostgreSQL data from legacy volume '$($pgCandidate.Name)' to 'sms_postgres_data'"
            if (Copy-VolumeData -SourceVolume $pgCandidate.Name -TargetVolume "sms_postgres_data") {
                if (Test-VolumeHasContent -VolumeName "sms_postgres_data") {
                    Write-Success "One-time migration completed for PostgreSQL volume (source: $($pgCandidate.Name))"
                    if ($script:LastMigrationSummary) {
                        $script:LastMigrationSummary = "$($script:LastMigrationSummary); PostgreSQL: $($pgCandidate.Name) -> sms_postgres_data"
                    } else {
                        $script:LastMigrationSummary = "PostgreSQL: $($pgCandidate.Name) -> sms_postgres_data"
                    }
                } else {
                    Write-Warning "PostgreSQL migration copy completed but target volume appears empty"
                }
            }
        }
    }

    $script:VolumeMigrationChecked = $true
}

function Get-ComposeContainerId {
    param([string]$ServiceName)

    if (-not (Test-Path $COMPOSE_BASE)) {
        return $null
    }

    Set-ComposeVolumeEnvironment
    Set-ComposeProfileEnvironment | Out-Null

    $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
    if (Test-Path $ROOT_ENV) {
        $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
    }

    $id = docker compose @composeArgs ps -q $ServiceName 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($id)) {
        return $null
    }

    return $id.Trim()
}

function Get-ComposeServiceStatus {
    param([string]$ServiceName)

    $id = Get-ComposeContainerId -ServiceName $ServiceName
    if (-not $id) {
        return $null
    }

    $statusRaw = docker inspect -f '{{.State.Status}}|{{.State.Health.Status}}' $id 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($statusRaw)) {
        return $null
    }

    $parts = $statusRaw -split '\|'
    $status = if ($parts.Count -gt 0) { $parts[0] } else { $null }
    $health = if ($parts.Count -gt 1) { $parts[1] } else { $null }

    return @{
        Id = $id
        Status = $status
        Health = $health
        IsRunning = $status -eq "running"
        IsHealthy = $health -eq "healthy"
    }
}

function Invoke-SqliteToPostgresMigration {
    $dbUrl = Get-EnvVarValue -Name "DATABASE_URL"
    if (-not $dbUrl -or -not $dbUrl.Trim().ToLower().StartsWith("postgresql")) {
        return $true
    }

    $sqlitePath = Join-Path $SCRIPT_DIR "data\student_management.db"
    if (-not (Test-Path $sqlitePath)) {
        return $true
    }

    $size = (Get-Item $sqlitePath).Length
    if ($size -lt 1024) {
        return $true
    }

    $sqliteInfo = Get-Item $sqlitePath
    $sourceFingerprint = "$($sqliteInfo.Length)|$($sqliteInfo.LastWriteTimeUtc.Ticks)"
    $triggerDir = Join-Path $SCRIPT_DIR "data\.triggers"
    $markerFile = Join-Path $triggerDir "sqlite_to_postgres.auto.migrated"

    if (Test-Path $markerFile) {
        try {
            $markerContent = (Get-Content $markerFile -Raw -ErrorAction Stop).Trim()
            if ($markerContent -eq $sourceFingerprint) {
                Write-Info "SQLite→PostgreSQL auto-migration already recorded for current source snapshot. Skipping."
                return $true
            }
            Write-Warning "SQLite migration marker exists but source snapshot changed; migration will run again in append-safe mode."
        } catch {
            Write-Warning "Could not read migration marker. Proceeding with append-safe migration."
        }
    }

    Write-Info "Detected legacy SQLite database. Starting migration to PostgreSQL..."

    $imageExists = docker images -q $IMAGE_TAG 2>$null
    if (-not $imageExists) {
        Write-Info "Migration requires app image. Building..."
        Push-Location $SCRIPT_DIR
        try {
            docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Failed to build image for migration"
                return $false
            }
        } finally {
            Pop-Location
        }
    }

    $migrateCmd = @(
        "run", "--rm",
        "--env-file", $ROOT_ENV,
        "-e", "DATABASE_URL=$dbUrl",
        "-v", "${SCRIPT_DIR}\data:/data",
        $IMAGE_TAG,
        "python", "-m", "backend.scripts.migrate_sqlite_to_postgres",
        "--sqlite-path", "/data/student_management.db",
        "--postgres-url", $dbUrl,
        "--no-truncate"
    )

    $output = & docker @migrateCmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "SQLite to PostgreSQL migration failed"
        if ($output) {
            Write-Host $output -ForegroundColor Yellow
        }
        return $false
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "student_management.db.migrated_$timestamp"
    try {
        Rename-Item -Path $sqlitePath -NewName $backupName -Force
        Write-Success "Migration completed. SQLite file archived: $backupName"
    } catch {
        Write-Warning "Migration completed, but SQLite file could not be renamed: $_"
    }

    try {
        if (-not (Test-Path $triggerDir)) {
            New-Item -ItemType Directory -Path $triggerDir -Force | Out-Null
        }
        Set-Content -Path $markerFile -Value $sourceFingerprint -NoNewline
        Write-Info "Recorded SQLite migration marker: $markerFile"
    } catch {
        Write-Warning "Failed to record SQLite migration marker: $_"
    }

    return $true
}

function Wait-ForComposeHealthy {
    param(
        [string]$ServiceName = "backend",
        [int]$TimeoutSeconds = 90
    )

    Write-Info "Waiting for compose service '$ServiceName' to become healthy..."

    $elapsed = 0
    $checkInterval = 3

    while ($elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval

        $status = Get-ComposeServiceStatus -ServiceName $ServiceName
        if (-not $status) {
            Write-Host "." -NoNewline
            continue
        }

        if ($status.IsHealthy -or ($status.IsRunning -and -not $status.Health)) {
            Write-Host "`n"
            Write-Success "Compose service '$ServiceName' is running"
            return $true
        }

        if (-not $status.IsRunning) {
            Write-Host "`n"
            Write-Error-Message "Compose service '$ServiceName' stopped unexpectedly"
            return $false
        }

        Write-Host "." -NoNewline
    }

    Write-Host "`n"
    Write-Error-Message "Timeout waiting for compose service '$ServiceName'"
    return $false
}

function Wait-ForLocalHttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45,
        [int]$CheckIntervalSeconds = 2
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return $false
    }

    Write-Info "Waiting for web endpoint '$Url'..."

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response -and $response.StatusCode) {
                Write-Host "`n"
                Write-Success "Web endpoint is reachable (HTTP $($response.StatusCode))"
                return $true
            }
        } catch {
            $httpResponse = $_.Exception.Response
            if ($null -ne $httpResponse -and $httpResponse.StatusCode) {
                Write-Host "`n"
                Write-Success "Web endpoint is reachable (HTTP $([int]$httpResponse.StatusCode))"
                return $true
            }
        }

        Start-Sleep -Seconds $CheckIntervalSeconds
        $elapsed += $CheckIntervalSeconds
        Write-Host "." -NoNewline
    }

    Write-Host "`n"
    Write-Warning "Timeout waiting for web endpoint '$Url'"
    return $false
}

function Complete-ComposeStartup {
    param([int]$WebTimeoutSeconds = 45)

    $webUrl = "http://localhost:$PORT/"
    if (-not (Wait-ForLocalHttpEndpoint -Url $webUrl -TimeoutSeconds $WebTimeoutSeconds)) {
        Write-Error-Message "Compose stack started but web frontend is not reachable on $webUrl"
        return $false
    }

    Show-AccessInfo -MonitoringEnabled:$false
    return $true
}

function Test-SafePostgresIdentifier {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return ($Value -match '^[A-Za-z_][A-Za-z0-9_]*$')
}

function Test-ComposePostgresAuthFailure {
    param(
        [string[]]$ComposeArgs,
        [int]$Tail = 200
    )

    $backendLogs = docker compose @ComposeArgs logs --tail $Tail backend 2>&1
    if (-not $backendLogs) {
        return $false
    }

    $backendText = ($backendLogs | Out-String)
    return ($backendText -match 'password authentication failed for user' -or $backendText -match 'FATAL:\s+password authentication failed')
}

function Get-ComposeConflictContainerNames {
    param([string]$ComposeOutputText)

    if ([string]::IsNullOrWhiteSpace($ComposeOutputText)) {
        return @()
    }

    $matches = [regex]::Matches($ComposeOutputText, 'container name "/([^"]+)" is already in use')
    if (-not $matches -or $matches.Count -eq 0) {
        return @()
    }

    $names = @()
    foreach ($match in $matches) {
        $name = $match.Groups[1].Value.Trim()
        if (-not [string]::IsNullOrWhiteSpace($name)) {
            $names += $name
        }
    }

    return @($names | Sort-Object -Unique)
}

function Invoke-ComposeNameConflictRecovery {
    param(
        [string[]]$ComposeArgs,
        [string]$ComposeOutputText
    )

    $conflictNames = Get-ComposeConflictContainerNames -ComposeOutputText $ComposeOutputText
    if (-not $conflictNames -or $conflictNames.Count -eq 0) {
        return $false
    }

    Write-Warning "Detected stale Docker container name conflict."

    foreach ($containerName in $conflictNames) {
        Write-Warning "Removing stale container '$containerName'..."
        $removeOutput = docker rm -f $containerName 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to remove stale container '$containerName'."
            if ($removeOutput) {
                $removeOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
            }
            return $false
        }
    }

    Write-Info "Retrying Docker Compose startup after stale container cleanup..."
    $retryOutput = docker compose @ComposeArgs up -d --build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Docker Compose retry after stale container cleanup failed."
        if ($retryOutput) {
            $retryOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }
        return $false
    }

    return $true
}

function Invoke-ComposePostgresCredentialRepair {
    param([string[]]$ComposeArgs)

    $pgUser = Get-EnvVarValue -Name "POSTGRES_USER"
    $pgPassword = Get-EnvVarValue -Name "POSTGRES_PASSWORD"
    $pgDb = Get-EnvVarValue -Name "POSTGRES_DB"

    if (-not (Test-SafePostgresIdentifier -Value $pgUser) -or -not (Test-SafePostgresIdentifier -Value $pgDb)) {
        Write-Warning "Skipping automatic PostgreSQL credential repair: unsupported POSTGRES_USER/POSTGRES_DB format."
        return $false
    }

    if ([string]::IsNullOrWhiteSpace($pgPassword)) {
        Write-Warning "Skipping automatic PostgreSQL credential repair: POSTGRES_PASSWORD is empty."
        return $false
    }

    $passwordSql = $pgPassword -replace "'", "''"
    $repairScript = @"
set -e
ADMIN_USER=""
PGDATA_DIR="`${PGDATA:-/var/lib/postgresql/data/pgdata}"
HBA_FILE="`$PGDATA_DIR/pg_hba.conf"
HBA_BACKUP=""

restore_hba() {
  if [ -n "`$HBA_BACKUP" ] && [ -f "`$HBA_BACKUP" ]; then
    cp "`$HBA_BACKUP" "`$HBA_FILE"
    rm -f "`$HBA_BACKUP"
    kill -HUP 1 >/dev/null 2>&1 || true
  fi
}

trap restore_hba EXIT

for candidate in "$pgUser" postgres; do
  if psql -U "`$candidate" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    ADMIN_USER="`$candidate"
    break
  fi
done

if [ -z "`$ADMIN_USER" ] && [ -f "`$HBA_FILE" ]; then
  HBA_BACKUP="`$HBA_FILE.sms-repair.bak"
  cp "`$HBA_FILE" "`$HBA_BACKUP"
  {
    echo "local all all trust"
    echo "host all all 127.0.0.1/32 trust"
    echo "host all all ::1/128 trust"
    cat "`$HBA_BACKUP"
  } > "`$HBA_FILE"
  kill -HUP 1 >/dev/null 2>&1 || true

  if psql -U "$pgUser" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    ADMIN_USER="$pgUser"
  fi
fi

if [ -z "`$ADMIN_USER" ]; then
  echo "Unable to find an accessible administrative PostgreSQL role for repair."
  exit 1
fi

if ! psql -U "`$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$pgUser'" | grep -q 1; then
  psql -U "`$ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE $pgUser LOGIN PASSWORD '$passwordSql';" >/dev/null
fi

psql -U "`$ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE $pgUser WITH LOGIN PASSWORD '$passwordSql';" >/dev/null
if ! psql -U "`$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$pgDb'" | grep -q 1; then
  createdb -U "`$ADMIN_USER" -O $pgUser $pgDb
fi
"@

    Write-Warning "Attempting automatic PostgreSQL credential repair for existing volume..."
    $repairOutput = docker compose @ComposeArgs exec -T postgres sh -lc $repairScript 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Automatic PostgreSQL credential repair failed."
        if ($repairOutput) {
            $repairOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }
        return $false
    }

    Write-Success "PostgreSQL credentials reconciled with .env values."
    return $true
}

function Invoke-ComposeAuthRecoveryAndRetry {
    param([string[]]$ComposeArgs)

    if (-not (Test-ComposePostgresAuthFailure -ComposeArgs $ComposeArgs)) {
        return $false
    }

    if (-not (Invoke-ComposePostgresCredentialRepair -ComposeArgs $ComposeArgs)) {
        return $false
    }

    Write-Info "Retrying backend startup after PostgreSQL credential repair..."
    $retryOutput = docker compose @ComposeArgs up -d backend 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Backend retry failed."
        if ($retryOutput) {
            $retryOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }
        return $false
    }

    return (Wait-ForComposeHealthy -ServiceName "backend" -TimeoutSeconds 90)
}

function Show-ComposeFailureDiagnostics {
    param(
        [string[]]$ComposeArgs,
        [int]$BackendTail = 120
    )

    Write-Warning "Collecting Docker Compose diagnostics..."

    $composePs = docker compose @ComposeArgs ps 2>&1
    if ($composePs) {
        Write-Host "Compose services:" -ForegroundColor Yellow
        $composePs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }

    $backendLogs = docker compose @ComposeArgs logs --tail $BackendTail backend 2>&1
    if ($backendLogs) {
        Write-Host "Backend logs (tail):" -ForegroundColor Yellow
        $backendLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }

    $postgresLogs = docker compose @ComposeArgs logs --tail 80 postgres 2>&1
    if ($postgresLogs) {
        Write-Host "PostgreSQL logs (tail):" -ForegroundColor Yellow
        $postgresLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }

    $backendText = ($backendLogs | Out-String)
    if ($backendText -match "sslmode=require|SSL|password authentication failed|database .* does not exist|connection refused|could not translate host name") {
        Write-Warning "Detected PostgreSQL connectivity/authentication issue."
        Write-Info "For internal postgres profile, use POSTGRES_SSLMODE=disable (or prefer)."
        Write-Info "If postgres volume already exists, credentials are fixed from first initialization."
        Write-Info "Ensure POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB in .env match the existing DB volume."
    }
}

function Initialize-EnvironmentFiles {
    Write-Info "Checking environment configuration..."

    $configured = $false
    $secretKey = -join ((48..57) + (65..90) + (97..122) + (45,95) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $postgresPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

    # Root .env
    if (-not (Test-Path $ROOT_ENV)) {
        if (Test-Path $ROOT_ENV_EXAMPLE) {
            Write-Info "Creating root .env from template..."
            $envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
            $envContent = $envContent -replace 'VERSION=.*', "VERSION=$VERSION"
            # CRITICAL: Production installs are PostgreSQL-only
            $envContent = $envContent -replace 'DATABASE_ENGINE=.*', "DATABASE_ENGINE=postgresql"
            Set-Content -Path $ROOT_ENV -Value $envContent
            Write-Success "Root .env created with secure SECRET_KEY (PostgreSQL required)"
            $configured = $true
        } else {
            Write-Warning ".env.example not found, creating minimal .env..."
            # Minimal .env for fresh install: PostgreSQL only
            $minimalEnv = @"
VERSION=$VERSION
SECRET_KEY=$secretKey
AUTH_ENABLED=True
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_FULL_NAME=System Administrator
DEFAULT_ADMIN_FORCE_RESET=False
DATABASE_ENGINE=postgresql
"@
            Set-Content -Path $ROOT_ENV -Value $minimalEnv
            Write-Success "Minimal .env created (PostgreSQL required)"
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

        # ====== PostgreSQL-only enforcement ======
        Write-Debug "Validating .env DATABASE_ENGINE setting..."
        $dbEngine = Get-EnvVarValue -Name "DATABASE_ENGINE"
        if (-not $dbEngine) {
            Write-Warning ".env is missing DATABASE_ENGINE setting"
            Write-Info "Adding DATABASE_ENGINE=postgresql"
            $rootContent = $rootContent + "`nDATABASE_ENGINE=postgresql`n"
            Set-Content -Path $ROOT_ENV -Value $rootContent
            $configured = $true
        } elseif ($dbEngine -ne "postgresql") {
            Write-Warning ".env has invalid DATABASE_ENGINE for production: $dbEngine"
            Write-Info "Correcting to: DATABASE_ENGINE=postgresql"
            $rootContent = $rootContent -replace 'DATABASE_ENGINE=.*', "DATABASE_ENGINE=postgresql"
            Set-Content -Path $ROOT_ENV -Value $rootContent
            $configured = $true
        }
        # ====== END PostgreSQL-only enforcement ======
    }

    # Ensure DATABASE_URL is available/normalized for PostgreSQL-only deployments
    $dbUrl = Get-EnvVarValue -Name "DATABASE_URL"
    $pgHost = Get-EnvVarValue -Name "POSTGRES_HOST"
    $pgPort = Get-EnvVarValue -Name "POSTGRES_PORT"
    $pgUser = Get-EnvVarValue -Name "POSTGRES_USER"
    $pgPassword = Get-EnvVarValue -Name "POSTGRES_PASSWORD"
    $pgDb = Get-EnvVarValue -Name "POSTGRES_DB"

    if ($pgHost -and $pgPort -and $pgUser -and $pgPassword -and $pgDb) {
        # Keep compatibility with legacy auto-generated URLs while fixing URI encoding
        # for credentials that contain reserved characters.
        $rawDbUrl = "postgresql://$pgUser`:$pgPassword@$pgHost`:$pgPort/$pgDb"
        $encodedDbUrl = New-PostgresDatabaseUrl -DbHost $pgHost -Port $pgPort -User $pgUser -Password $pgPassword -Database $pgDb

        $needsUrlWrite = $false
        $writeReason = $null

        if (-not $dbUrl) {
            $dbUrl = $encodedDbUrl
            $needsUrlWrite = $true
            $writeReason = "DATABASE_URL generated from POSTGRES_* settings"
        } elseif ($dbUrl -eq $rawDbUrl -and $rawDbUrl -ne $encodedDbUrl) {
            $dbUrl = $encodedDbUrl
            $needsUrlWrite = $true
            $writeReason = "DATABASE_URL normalized from legacy raw format"
        }

        if ($needsUrlWrite) {
            $rootContent = Get-Content $ROOT_ENV -Raw
            if ($rootContent -match 'DATABASE_URL=.*') {
                $rootContent = $rootContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$dbUrl"
            } else {
                $rootContent = $rootContent + "`nDATABASE_URL=$dbUrl`n"
            }
            Set-Content -Path $ROOT_ENV -Value $rootContent
            Write-Success $writeReason
            $configured = $true
        }
    } elseif (-not $dbUrl) {
        Write-Error-Message "DATABASE_URL is required for PostgreSQL-only deployments"
        Write-Info "Set DATABASE_URL or POSTGRES_* variables in .env and re-run"
        return $false
    }

    # Backend .env
    if (-not (Test-Path $BACKEND_ENV)) {
        if (Test-Path $BACKEND_ENV_EXAMPLE) {
            Write-Info "Creating backend .env from template..."
            $envContent = Get-Content $BACKEND_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=your-secret-key-change-this-in-production.*', "SECRET_KEY=$secretKey"
            $envContent = $envContent -replace 'POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$postgresPassword"
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
        Write-Warning "Change password after first login in Control Panel -> Maintenance"
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
    $null = docker volume inspect $VOLUME_NAME 2>$null
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
            $null = docker exec $CONTAINER_NAME test -f /data/student_management.db 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "No database file found - skipping backup (fresh installation)"
                return $true  # Not an error for fresh installs
            }
            docker exec $CONTAINER_NAME sh -c "cp /data/student_management.db /data/backup_temp.db" 2>$null
            docker cp "${CONTAINER_NAME}:/data/backup_temp.db" $backupPath 2>$null
            docker exec $CONTAINER_NAME sh -c "rm -f /data/backup_temp.db" 2>$null
        } else {
            Write-Info "Backing up from Docker volume..."
            # Check if database exists in volume first
            $null = docker run --rm `
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

            # ====== PERSISTENCE FIX: Verify Database File in Volume ======
            # Ensure the SQLite database file is actually being persisted
            Write-Info "Verifying database persistence in volume..."
            $dbCheckOutput = docker exec $CONTAINER_NAME sh -c 'if [ -f /data/student_management.db ]; then ls -lh /data/student_management.db; else echo "DATABASE_NOT_FOUND"; fi' 2>&1

            if ($dbCheckOutput -contains "DATABASE_NOT_FOUND" -or $dbCheckOutput -match "DATABASE_NOT_FOUND") {
                Write-Warning "⚠️  Database file not found in persistent volume!"
                Write-Error-Message "This indicates a volume persistence issue on your Docker installation"
                Write-Info "Troubleshooting steps:"
                Write-Host "  1. Check if volume exists:  docker volume inspect sms_data"
                Write-Host "  2. Check volume contents:   docker run --rm -v sms_data:/vol alpine ls -lh /vol/"
                Write-Host "  3. Restart container:       .\DOCKER.ps1 -Restart"
                Write-Host "  4. See DATABASE_PERSISTENCE_FIX.md for detailed help"
                return $false
            } else {
                Write-Success "✓ Database file confirmed in persistent volume"
                if ($dbCheckOutput) {
                    Write-Debug "  $dbCheckOutput"
                }
            }
            # ====== END PERSISTENCE FIX ======

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
        Write-Host "  π“ Grafana:    http://localhost:$actualGrafanaPort (admin/admin)" -ForegroundColor Cyan
        Write-Host "  π” Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor Cyan
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

function Invoke-DockerCleanup {
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

function New-DesktopShortcut {
    <#
    .SYNOPSIS
        Create Windows desktop shortcut for SMS Toggle
    #>
    Write-Host ""
    Write-Info "Setting up desktop shortcut..."

    $desktopPath = [Environment]::GetFolderPath("Desktop")
    # Use SMS_Manager.exe as the primary user-facing launcher (start/stop/status)
    $managerExe = Join-Path $SCRIPT_DIR "SMS_Manager.exe"
    $iconPath = Join-Path $SCRIPT_DIR "SMS_Toggle.ico"
    $shortcutPath = Join-Path $desktopPath "SMS Toggle.lnk"

    # Check if manager executable exists
    if (-not (Test-Path $managerExe)) {
        Write-Warning "SMS_Manager.exe not found - skipping shortcut creation"
        return $false
    }

    try {
        $WshShell = New-Object -ComObject WScript.Shell

        # Remove old shortcut if exists
        if (Test-Path $shortcutPath) {
            Remove-Item $shortcutPath -Force | Out-Null
        }

        # Create new shortcut
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $managerExe
        $shortcut.Arguments = ""
        $shortcut.WorkingDirectory = $SCRIPT_DIR
        $shortcut.Description = "Manage SMS Docker Application (Start/Stop)"

        # Use custom icon if available
        if (Test-Path $iconPath) {
            $shortcut.IconLocation = $iconPath
        } else {
            $shortcut.IconLocation = "shell32.dll,21"
        }

        $shortcut.Save()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($WshShell) | Out-Null

        Write-Success "Desktop shortcut created: SMS Toggle"
        return $true
    }
    catch {
        Write-Warning "Failed to create desktop shortcut: $_"
        return $false
    }
}

function Start-Installation {
    if ($Silent) { Write-InstallerLog "Start-Installation called" }
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

    # Build runtime artifacts
    Write-Host ""
    if (Use-ComposeMode) {
        Write-Info "Building Docker Compose runtime images (backend/frontend)..."

        if (-not (Test-Path $COMPOSE_BASE) -or -not (Test-Path $COMPOSE_PROD)) {
            Write-Error-Message "Compose files not found for installer runtime validation"
            return 1
        }

        Set-ComposeVolumeEnvironment
        Set-ComposeProfileEnvironment | Out-Null

        $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
        if (Test-Path $ROOT_ENV) {
            $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
        }

        Push-Location $SCRIPT_DIR
        try {
            docker compose @composeArgs build backend frontend 2>&1 | Out-Null

            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Compose image build failed"
                return 1
            }

            Write-Success "Compose runtime images built successfully"
        } finally {
            Pop-Location
        }
    }
    else {
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
    }

    # Installation complete
    Write-Host ""
    Write-Header "Installation Complete!"
    Write-Host ""

    # Create desktop shortcut only if not suppressed (installer handles it)
    if (-not $NoShortcut) {
        New-DesktopShortcut | Out-Null
        Write-Info "Desktop shortcut created for quick Start/Stop access" -ForegroundColor Green
    }

    Write-Info "Next steps:"
    Write-Host "  1. Start application:  .\DOCKER.ps1 -Start" -ForegroundColor White
    Write-Host "  2. Access web app:     http://localhost:$PORT" -ForegroundColor White
    Write-Host "  3. Login:              admin@example.com / YourSecurePassword123!" -ForegroundColor White
    Write-Host "  4. Change password:    Control Panel -> Maintenance" -ForegroundColor White
    Write-Host ""

    # In silent mode, don't prompt and don't auto-start
    if ($Silent) {
        Write-Info "Silent mode: Installation complete. Run .\DOCKER.ps1 -Start to launch."
        return 0
    }

    $startNow = Read-Host "Start application now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($startNow) -or $startNow -match '^[Yy]') {
        return Start-Application
    }

    return 0
}

function Start-Application {
    if ($Silent) { Write-InstallerLog "Start-Application called" }
    Write-Header "Starting SMS Application"

    Write-DebugInfo "Current user: $(whoami)"
    Write-DebugInfo "Process ID: $PID"
    Write-DebugInfo "Script directory: $SCRIPT_DIR"
    Write-DebugInfo "Docker command availability: $(where.exe docker 2>&1)"

    if (-not (Test-DockerAvailable)) {
        Write-InstallerLog "START-APPLICATION FAILED: Docker not available" -IsError
        Write-Error-Message "Docker is not available"
        return 1
    }

    Write-DebugInfo "Docker available - proceeding with startup"

    # Check if already running
    $status = Get-ContainerStatus
    $withMonitoringBool = $false
    if ($null -ne $WithMonitoring -and $WithMonitoring) { $withMonitoringBool = $true }
    if ($status -and $status.IsRunning) {
        if ($status.IsHealthy) {
            Write-Success "SMS is already running!"
            Show-AccessInfo -MonitoringEnabled:$withMonitoringBool
            return 0
        } else {
            Write-Info "SMS is starting up..."
            if (Wait-ForHealthy) {
                Show-AccessInfo -MonitoringEnabled:$withMonitoringBool
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

    # One-time migration of legacy Docker volumes to canonical names
    # (handles project-name-prefixed legacy volumes from installer/compose contexts)
    Invoke-OneTimeVolumeMigration

    # Validate SECRET_KEY security for production deployments
    if (Test-Path $ROOT_ENV) {
        $envContent = Get-Content $ROOT_ENV -Raw
        if ($envContent -match 'SECRET_KEY=(.+)') {
            $currentKey = $matches[1].Trim()
            $envType = if ($envContent -match 'SMS_ENV=(.+)') { $matches[1].Trim() } else { "production" }

            if (-not (Test-SecretKeySecure -Key $currentKey -EnvType $envType)) {
                Write-Host ""
                Write-Error-Message "CRITICAL SECURITY ISSUE: Weak or default SECRET_KEY detected!"
                Write-Warning "This allows JWT token forgery and complete authentication bypass."
                Write-Host ""
                Write-Info "Generate a secure key:"
                Write-Host "  python -c `"import secrets; print(secrets.token_urlsafe(48))`"" -ForegroundColor Yellow
                Write-Host ""
                Write-Info "Update in .env file:"
                Write-Host "  SECRET_KEY=<generated_key>" -ForegroundColor Yellow
                Write-Host ""
                return 1
            }
            Write-Success "SECRET_KEY security validated"
        }
    }

    $useCompose = Use-ComposeMode
    if ($useCompose) {
        $dbEngine = Get-EnvVarValue -Name "DATABASE_ENGINE"
        if (-not $dbEngine -or $dbEngine -ne "postgresql") {
            Write-Error-Message "PostgreSQL-only mode enforced. Set DATABASE_ENGINE=postgresql in .env"
            return 1
        }

        $activeProfile = Set-ComposeProfileEnvironment
        if ($activeProfile) {
            Write-Info "Compose profile enabled: $activeProfile"
        }

        Write-Info "Detected PostgreSQL configuration - using Docker Compose (production overlay)"
        Set-ComposeVolumeEnvironment

        $env:FRONTEND_VERSION = $VERSION
        $dockerVersionString = Get-DockerVersionString
        if ($dockerVersionString) {
            $env:HOST_DOCKER_VERSION = $dockerVersionString
        }

        if (-not (Test-Path $COMPOSE_BASE) -or -not (Test-Path $COMPOSE_PROD)) {
            Write-Error-Message "Compose files not found for production deployment"
            return 1
        }

        $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
        if (Test-Path $ROOT_ENV) {
            $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
        }

        Push-Location $SCRIPT_DIR
        try {
            if (-not (Invoke-SqliteToPostgresMigration)) {
                return 1
            }
            $composeOutput = docker compose @composeArgs up -d --build 2>&1
            if ($LASTEXITCODE -ne 0) {
                # Capture actual error for logging
                if ($Silent) {
                    Write-InstallerLog "Docker Compose error output:"
                    $composeOutput | ForEach-Object { Write-InstallerLog "$_" }
                }
                Write-Error-Message "Failed to start Docker Compose stack"
                Write-Warning "Docker Compose output:"
                $composeOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
                $composeText = ($composeOutput | Out-String)
                if ($composeText -match 'depends on undefined service "postgres"') {
                    Write-Warning "Compose profile mismatch detected (postgres service excluded)."
                    Write-Info "Use internal profile values (POSTGRES_HOST=postgres) or clear DATABASE_URL for bundled PostgreSQL."
                }
                if (Invoke-ComposeNameConflictRecovery -ComposeArgs $composeArgs -ComposeOutputText $composeText) {
                    if ((Wait-ForComposeHealthy -ServiceName "backend") -and (Complete-ComposeStartup)) {
                        return 0
                    }
                    if ((Invoke-ComposeAuthRecoveryAndRetry -ComposeArgs $composeArgs) -and (Complete-ComposeStartup)) {
                        return 0
                    }
                    Write-Warning "Compose retry succeeded but backend is still not healthy."
                }
                if ((Invoke-ComposeAuthRecoveryAndRetry -ComposeArgs $composeArgs) -and (Complete-ComposeStartup)) {
                    return 0
                }
                Show-ComposeFailureDiagnostics -ComposeArgs $composeArgs
                return 1
            }
        } finally {
            Pop-Location
        }

        if ((Wait-ForComposeHealthy -ServiceName "backend") -and (Complete-ComposeStartup)) {
            return 0
        }

        if ((Invoke-ComposeAuthRecoveryAndRetry -ComposeArgs $composeArgs) -and (Complete-ComposeStartup)) {
            return 0
        }

        Write-Error-Message "Compose stack started but backend is not healthy"
        Show-ComposeFailureDiagnostics -ComposeArgs $composeArgs
        return 1
    }

    Write-Error-Message "PostgreSQL-only mode enforced. Configure DATABASE_URL and DATABASE_ENGINE=postgresql."
    return 1
}

function Stop-Application {
    if ($Silent) { Write-InstallerLog "Stop-Application called" }
    Write-Header "Stopping SMS Application"

    if (Use-ComposeMode) {
        Write-Info "Stopping Docker Compose stack..."
        if (Test-Path $COMPOSE_BASE) {
            Set-ComposeVolumeEnvironment
            Set-ComposeProfileEnvironment | Out-Null
            $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
            if (Test-Path $ROOT_ENV) {
                $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
            }

            Push-Location $SCRIPT_DIR
            try {
                $downOutput = docker compose @composeArgs down --remove-orphans 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Compose stack stopped"
                    return 0
                }
                if ($downOutput) {
                    Write-Warning "Docker Compose stop output:"
                    $downOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
                    $downText = ($downOutput | Out-String)
                    if ($downText -match 'depends on undefined service "postgres"') {
                        Write-Warning "Compose profile mismatch detected during stop."
                        Write-Info "This install uses the bundled PostgreSQL profile; re-run with DATABASE_URL targeting @postgres."
                    }
                }
            } finally {
                Pop-Location
            }
        }

        Write-Error-Message "Failed to stop compose stack"
        return 1
    }

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
    if ($Silent) { Write-InstallerLog "Restart-Application called" }
    Write-Header "Restarting SMS Application"

    $stopResult = Stop-Application
    if ($stopResult -ne 0) {
        return $stopResult
    }

    Start-Sleep -Seconds 2
    return Start-Application
}

function Show-Status {
    if ($Silent) { Write-InstallerLog "Show-Status called" }
    Write-Header "SMS Application Status"

    if (-not (Test-DockerAvailable)) {
        Write-Error-Message "Docker is not available"
        return 1
    }
    Write-Success "Docker is available"

    if (Use-ComposeMode) {
        if (-not (Test-Path $COMPOSE_BASE)) {
            Write-Error-Message "Compose file not found"
            return 1
        }

        Set-ComposeVolumeEnvironment
        Set-ComposeProfileEnvironment | Out-Null
        $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
        if (Test-Path $ROOT_ENV) {
            $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
        }

        Write-Host "`nVolumes:   " -NoNewline -ForegroundColor Cyan
        Write-Host "sms_data=$($script:SelectedSmsDataVolume); postgres_data=$($script:SelectedPostgresDataVolume)" -ForegroundColor White
        if ($script:LastMigrationSummary) {
            Write-Host "Migration: " -NoNewline -ForegroundColor Cyan
            Write-Host $script:LastMigrationSummary -ForegroundColor Yellow
        }

        Push-Location $SCRIPT_DIR
        try {
            docker compose @composeArgs ps
            return $LASTEXITCODE
        } finally {
            Pop-Location
        }
    }

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
            Write-Host "Healthy OK" -ForegroundColor Green
        } else {
            Write-Host "Starting..." -ForegroundColor Yellow
        }

        if ($status.Ports) {
            Write-Host "Ports:     " -NoNewline -ForegroundColor Cyan
            Write-Host $status.Ports -ForegroundColor White
        }

        Write-Host "`nWeb Interface: http://localhost:$PORT" -ForegroundColor Green
    }

    Write-Host "Volumes:   " -NoNewline -ForegroundColor Cyan
    Write-Host "sms_data=$VOLUME_NAME" -ForegroundColor White
    if ($script:LastMigrationSummary) {
        Write-Host "Migration: " -NoNewline -ForegroundColor Cyan
        Write-Host $script:LastMigrationSummary -ForegroundColor Yellow
    }

    # Check monitoring
    $monStatus = Get-MonitoringStatus
    if ($monStatus.IsRunning) {
        Write-Host "`nMonitoring: " -NoNewline -ForegroundColor Cyan
        Write-Host "Running OK" -ForegroundColor Green
        Write-Host "  Grafana:    http://localhost:$GrafanaPort" -ForegroundColor White
        Write-Host "  Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor White
    }

    Write-Host ""
    return 0
}

function Show-Logs {
    if ($Silent) { Write-InstallerLog "Show-Logs called" }

    if (Use-ComposeMode) {
        if (-not (Test-Path $COMPOSE_BASE)) {
            Write-Error-Message "Compose file not found"
            return 1
        }

        Write-Header "SMS Application Logs"
        Write-Info "Press Ctrl+C to stop viewing logs`n"
        Set-ComposeVolumeEnvironment
        Set-ComposeProfileEnvironment | Out-Null
        $composeArgs = @("-f", $COMPOSE_BASE, "-f", $COMPOSE_PROD)
        if (Test-Path $ROOT_ENV) {
            $composeArgs = @("--env-file", $ROOT_ENV) + $composeArgs
        }

        Push-Location $SCRIPT_DIR
        try {
            docker compose @composeArgs logs -f --tail 100 backend
            return $LASTEXITCODE
        } finally {
            Pop-Location
        }
    }

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
    if ($Silent) { Write-InstallerLog "Update-Application called" }

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
        Invoke-DockerCleanup -All | Out-Null
        $buildArgs = @("build", "--pull", "--no-cache", "-t", $IMAGE_TAG, "-f", "docker/Dockerfile.fullstack", ".")
    } else {
        Write-Info "Fast rebuild (cached)..."
        # Remove --pull to allow proper content-based cache detection
        $buildArgs = @("build", "-t", $IMAGE_TAG, "-f", "docker/Dockerfile.fullstack", ".")
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
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "              SMS is now running!              " -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Web Interface:  http://localhost:$PORT" -ForegroundColor Cyan
    Write-Host "  API Docs:       http://localhost:${PORT}/docs" -ForegroundColor Cyan
    Write-Host "  Health Check:   http://localhost:${PORT}/health" -ForegroundColor Cyan

    if ($MonitoringEnabled) {
        $monStatus = Get-MonitoringStatus
        if ($monStatus.IsRunning) {
            Write-Host ""
            Write-Host "  Monitoring:" -ForegroundColor Yellow
            Write-Host "    Grafana:    http://localhost:$GrafanaPort" -ForegroundColor Cyan
            Write-Host "    Prometheus: http://localhost:$DEFAULT_PROMETHEUS_PORT" -ForegroundColor Cyan
        }
    }

    Write-Host ""
    Write-Host "  Quick Commands:" -ForegroundColor Yellow
    Write-Host "    .\DOCKER.ps1 -Stop    -> Stop application" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Update  -> Update application" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Logs    -> View logs" -ForegroundColor White
    Write-Host "    .\DOCKER.ps1 -Status  -> Check status" -ForegroundColor White
    Write-Host ""

    # Auto-open web interface in browser
    try {
        Write-Info "Opening web interface in browser..."
        Start-Process "http://localhost:$PORT"
    } catch {
        Write-Warning "Could not open browser automatically. Please visit: http://localhost:$PORT"
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
    $code = Invoke-DockerCleanup -All:$PruneAll -Deep:$DeepClean
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
