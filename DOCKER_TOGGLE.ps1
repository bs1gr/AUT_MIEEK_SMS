<#
.SYNOPSIS
    Toggle SMS Docker Application - Start if stopped, Stop if running

.DESCRIPTION
    Smart toggle script for desktop shortcut usage.
    - If SMS is not running → Start it
    - If SMS is running → Stop it
    Single-click convenience for Desktop shortcuts

.NOTES
    Version: 1.0.0
    Created for: Desktop shortcut quick access
    Dependencies: DOCKER.ps1 in same directory
#>

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$DOCKER_SCRIPT = Join-Path $SCRIPT_DIR "DOCKER.ps1"
$CONTAINER_NAME = "sms-app"
$LOG_FILE = Join-Path $SCRIPT_DIR "logs\docker_toggle.log"

# Ensure logs directory exists
$logsDir = Join-Path $SCRIPT_DIR "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Function to log messages
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Get-ContainerStatus {
    try {
        $container = docker ps -a --filter "name=^${CONTAINER_NAME}$" --format "{{.Status}}" 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($container)) {
            return @{ Exists = $false; IsRunning = $false }
        }

        $isRunning = $container -match '^Up '
        return @{ Exists = $true; IsRunning = $isRunning }
    }
    catch {
        return @{ Exists = $false; IsRunning = $false }
    }
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

# ============================================================================
# MAIN TOGGLE LOGIC
# ============================================================================

Clear-Host
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SMS Docker Toggle - Smart Start/Stop" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Log "========== Toggle Started =========="

# Check if Docker is available
Write-Log "Checking Docker availability..."
if (-not (Test-DockerAvailable)) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              ❌ DOCKER NOT AVAILABLE ❌             ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Error-Message "Docker is not running"
    Write-Host ""
    Write-Info "SOLUTION: Start Docker Desktop first, then try again"
    Write-Host ""
    Write-Log "ERROR: Docker not available"
    
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "Press ENTER to close..." -ForegroundColor Yellow -BackgroundColor DarkRed
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Read-Host
    exit 1
}
Write-Log "Docker is available"

# Check DOCKER.ps1 exists
Write-Log "Checking for DOCKER.ps1 at: $DOCKER_SCRIPT"
if (-not (Test-Path $DOCKER_SCRIPT)) {
    Write-Error-Message "DOCKER.ps1 not found at: $DOCKER_SCRIPT"
    Write-Log "ERROR: DOCKER.ps1 not found"
    Write-Host "`nPress any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Log "DOCKER.ps1 found"

# Get current status
Write-Log "Getting container status..."
$status = Get-ContainerStatus
Write-Log "Container exists: $($status.Exists), Is running: $($status.IsRunning)"

# Toggle based on status
if ($status.IsRunning) {
    # Container is running → STOP IT
    Write-Info "SMS is currently running"
    Write-Host "🛑 Stopping application..." -ForegroundColor Yellow
    Write-Host ""
    Write-Log "Stopping SMS..."
    
    & $DOCKER_SCRIPT -Stop -NoPause
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Success "SMS stopped successfully"
        Write-Log "SMS stopped successfully (exit code: 0)"
        Write-Host ""
        Write-Info "Click the shortcut again to start"
    } else {
        Write-Host ""
        Write-Error-Message "Failed to stop SMS"
        Write-Log "ERROR: Failed to stop SMS (exit code: $LASTEXITCODE)"
    }
}
else {
    # Container is not running → START IT
    Write-Info "SMS is currently stopped"
    Write-Host "🚀 Starting application..." -ForegroundColor Green
    Write-Host ""
    Write-Log "Starting SMS..."
    
    & $DOCKER_SCRIPT -Start -NoPause
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Success "SMS started successfully"
        Write-Log "SMS started successfully (exit code: 0)"
        Write-Host ""
        Write-Host "  📱 Access at: http://localhost:8080" -ForegroundColor Cyan
        Write-Host ""
        Write-Info "Click the shortcut again to stop"
    } else {
        Write-Host ""
        Write-Error-Message "Failed to start SMS"
        Write-Log "ERROR: Failed to start SMS (exit code: $LASTEXITCODE)"
    }
}

Write-Host ""
Write-Log "Toggle completed with exit code: $LASTEXITCODE"
Write-Log "========== Toggle Ended ==========`n"

# Multiple methods to keep window open
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Press ANY KEY to close this window..." -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Try multiple methods to pause
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Read-Host "Press ENTER to close"
}

exit $LASTEXITCODE
