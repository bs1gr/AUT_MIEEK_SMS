#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Student Management System - Docker Container Management

.DESCRIPTION
    Simple Docker container lifecycle management for SMS v1.3.8+
    Docker-only release - all operations managed via Docker Compose
    For advanced operations, use the Control Panel in the web app

.PARAMETER Quick
    Quick start - Start containers in detached mode

.PARAMETER Status
    Show container status and exit

.PARAMETER Stop
    Stop all containers

.PARAMETER Restart
    Restart all containers

.PARAMETER Logs
    Show container logs (backend by default)

.PARAMETER Help
    Show this help message

.EXAMPLE
    .\SMS.ps1
    Interactive mode - shows status and available commands

.EXAMPLE
    .\SMS.ps1 -Quick
    Start containers immediately

.EXAMPLE
    .\SMS.ps1 -Stop
    Stop all containers

.EXAMPLE
    .\SMS.ps1 -Status
    Show current container status

.EXAMPLE
    .\SMS.ps1 -Logs
    Show backend container logs

.NOTES
    Version: 1.3.8+
    Docker-only release
    For setup: Run .\SMART_SETUP.ps1 first
    For operations: Use Control Panel at http://localhost:8080 (Power tab)
#>

param(
    [switch]$Quick,
    [Alias('Status')][switch]$ShowStatus,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Test-DockerRunning {
    try {
        $null = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Get-ContainerStatus {
    <#
    .SYNOPSIS
        Get status of SMS Docker containers
    #>

    if (-not (Test-DockerRunning)) {
        return @{
            DockerRunning = $false
            Containers = @()
            Message = "Docker is not running"
        }
    }

    try {
        # Get SMS containers
        $containers = docker ps -a --filter "name=student-management-system" --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>$null

        $containerInfo = @()
        if ($containers) {
            foreach ($line in $containers) {
                $parts = $line -split '\|'
                if ($parts.Length -ge 2) {
                    $containerInfo += @{
                        Name = $parts[0]
                        Status = $parts[1]
                        Ports = if ($parts.Length -ge 3) { $parts[2] } else { "" }
                        IsRunning = $parts[1] -match '^Up '
                    }
                }
            }
        }

        return @{
            DockerRunning = $true
            Containers = $containerInfo
            Message = if ($containerInfo.Count -eq 0) { "No containers found" } else { "$($containerInfo.Count) container(s) found" }
        }
    }
    catch {
        return @{
            DockerRunning = $true
            Containers = @()
            Message = "Error checking containers: $($_.Exception.Message)"
        }
    }
}

function Show-Status {
    <#
    .SYNOPSIS
        Display current system status
    #>

    Write-Header "Student Management System v$version - Status" "Cyan"

    $status = Get-ContainerStatus

    if (-not $status.DockerRunning) {
        Write-Error2 "Docker Desktop is not running"
        Write-Info "Please start Docker Desktop and try again"
        return
    }

    Write-Success "Docker Desktop is running"
    Write-Host ""

    if ($status.Containers.Count -eq 0) {
        Write-Warning2 "No SMS containers found"
        Write-Info "Run '.\SMART_SETUP.ps1' to initialize the system"
        Write-Info "Or run '.\SMS.ps1 -Quick' to start containers"
    }
    else {
        Write-Host "Containers:" -ForegroundColor Yellow
        foreach ($container in $status.Containers) {
            $statusColor = if ($container.IsRunning) { "Green" } else { "Red" }
            $statusIcon = if ($container.IsRunning) { "✓" } else { "✗" }

            Write-Host "  $statusIcon " -ForegroundColor $statusColor -NoNewline
            Write-Host "$($container.Name)" -ForegroundColor White
            Write-Host "     Status: " -ForegroundColor Gray -NoNewline
            Write-Host "$($container.Status)" -ForegroundColor $statusColor

            if ($container.Ports) {
                Write-Host "     Ports: $($container.Ports)" -ForegroundColor Gray
            }
        }

        Write-Host ""

        # Show access URLs if containers are running
        $runningContainers = $status.Containers | Where-Object { $_.IsRunning }
        if ($runningContainers.Count -gt 0) {
            Write-Host "Access URLs:" -ForegroundColor Yellow
            Write-Host "  Main App: " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:8080" -ForegroundColor Cyan
            Write-Host "  API Docs: " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:8080/docs" -ForegroundColor Cyan
            Write-Host "  Control Panel: " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:8080 → Power Tab" -ForegroundColor Cyan
        }
    }

    Write-Host ""
}

function Start-Containers {
    <#
    .SYNOPSIS
        Start Docker containers
    #>

    Write-Header "Starting SMS Containers" "Green"

    if (-not (Test-DockerRunning)) {
        Write-Error2 "Docker Desktop is not running"
        Write-Info "Please start Docker Desktop first"
        return $false
    }

    Write-Info "Starting containers with docker compose..."

    try {
        $output = docker compose up -d 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Containers started successfully"
            Write-Host ""
            Start-Sleep -Seconds 2
            Show-Status
            return $true
        }
        else {
            Write-Error2 "Failed to start containers"
            Write-Host $output
            return $false
        }
    }
    catch {
        Write-Error2 "Error starting containers: $($_.Exception.Message)"
        return $false
    }
}

function Stop-Containers {
    <#
    .SYNOPSIS
        Stop Docker containers
    #>

    Write-Header "Stopping SMS Containers" "Yellow"

    if (-not (Test-DockerRunning)) {
        Write-Warning2 "Docker Desktop is not running (containers already stopped)"
        return $true
    }

    Write-Info "Stopping containers with docker compose..."

    try {
        $output = docker compose down 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Containers stopped successfully"
            return $true
        }
        else {
            Write-Error2 "Failed to stop containers"
            Write-Host $output
            return $false
        }
    }
    catch {
        Write-Error2 "Error stopping containers: $($_.Exception.Message)"
        return $false
    }
}

function Restart-Containers {
    <#
    .SYNOPSIS
        Restart Docker containers
    #>

    Write-Header "Restarting SMS Containers" "Magenta"

    if (-not (Test-DockerRunning)) {
        Write-Error2 "Docker Desktop is not running"
        Write-Info "Please start Docker Desktop first"
        return $false
    }

    Write-Info "Restarting containers..."

    try {
        # Try restart first (faster)
        $output = docker compose restart 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Containers restarted successfully"
            Write-Host ""
            Start-Sleep -Seconds 2
            Show-Status
            return $true
        }
        else {
            # Fallback to down + up
            Write-Info "Restart failed, trying down + up..."
            Stop-Containers
            Start-Sleep -Seconds 1
            return Start-Containers
        }
    }
    catch {
        Write-Error2 "Error restarting containers: $($_.Exception.Message)"
        return $false
    }
}

function Show-Logs {
    <#
    .SYNOPSIS
        Show container logs
    #>
    param(
        [string]$Container = "backend",
        [int]$Lines = 50
    )

    Write-Header "Container Logs - $Container" "Blue"

    if (-not (Test-DockerRunning)) {
        Write-Error2 "Docker Desktop is not running"
        return
    }

    try {
        $containerName = "student-management-system-$Container-1"

        # Check if container exists
        $exists = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null

        if (-not $exists) {
            Write-Error2 "Container '$containerName' not found"
            Write-Info "Available containers:"
            docker ps -a --filter "name=student-management-system" --format "  {{.Names}}"
            return
        }

        Write-Info "Showing last $Lines lines (press Ctrl+C to exit)..."
        Write-Host ""

        docker logs --tail $Lines -f $containerName
    }
    catch {
        Write-Error2 "Error showing logs: $($_.Exception.Message)"
    }
}

function Show-Help {
    <#
    .SYNOPSIS
        Display help information
    #>

    Write-Header "Student Management System v$version - Help" "Cyan"

    Write-Host @"
Docker-only Release - Simple Container Management

USAGE:
  .\SMS.ps1 [OPTIONS]

OPTIONS:
  -Quick              Start containers immediately
  -Status             Show container status
  -Stop               Stop all containers
  -Restart            Restart all containers
  -Logs               Show backend container logs
  -Help               Show this help message

EXAMPLES:
  .\SMS.ps1                    # Interactive mode (show status)
  .\SMS.ps1 -Quick             # Quick start
  .\SMS.ps1 -Stop              # Stop containers
  .\SMS.ps1 -Restart           # Restart containers
  .\SMS.ps1 -Logs              # View logs

FIRST TIME SETUP:
  .\SMART_SETUP.ps1            # Initialize and start the system

ADVANCED OPERATIONS:
  • Database Backup/Restore
  • Diagnostics & Troubleshooting
  • Port Monitoring
  • Environment Info

  👉 Use the Control Panel in the web app:
     http://localhost:8080 → Power Tab

DOCKER COMMANDS (Direct):
  docker compose up -d         # Start containers
  docker compose down          # Stop containers
  docker compose restart       # Restart containers
  docker compose logs -f       # Follow logs
  docker ps                    # List containers

SUPPORT:
  • Documentation: ./docs/
  • Issues: GitHub repository
  • Version: $version

"@

    Write-Host ""
}

# ============================================================================
#  MAIN EXECUTION
# ============================================================================

# Show header
Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Student Management System - Docker Management              ║" -ForegroundColor Cyan
Write-Host "║                      Version $version                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Handle command-line parameters
if ($Help) {
    Show-Help
    exit 0
}

if ($ShowStatus) {
    Show-Status
    exit 0
}

if ($Stop) {
    $success = Stop-Containers
    exit $(if ($success) { 0 } else { 1 })
}

if ($Restart) {
    $success = Restart-Containers
    exit $(if ($success) { 0 } else { 1 })
}

if ($Quick) {
    $success = Start-Containers
    exit $(if ($success) { 0 } else { 1 })
}

if ($Logs) {
    Show-Logs
    exit 0
}

# Interactive mode (default)
Show-Status

Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "  .\SMS.ps1 -Quick     # Start containers" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Stop      # Stop containers" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Restart   # Restart containers" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Logs      # View logs" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Help      # Full help" -ForegroundColor Gray
Write-Host ""
