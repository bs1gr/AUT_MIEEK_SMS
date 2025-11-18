#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Student Management System - Environment Management (Docker + Native)

.DESCRIPTION
    Simple lifecycle management for SMS deployments.
    - Stops both Docker containers and native dev servers started via SMART_SETUP
    - Provides status helpers and log inspection utilities
    For advanced operations, use the Control Panel in the web app

.PARAMETER Quick
    Quick start - Start containers in detached mode

.PARAMETER Status
    Show container status and exit

.PARAMETER Stop
    Stop Docker containers and any recorded native dev servers

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
    For setup: Run .\SMART_SETUP.ps1 first
    For operations: Use Control Panel at http://localhost:8080 (Power tab)
#>

param(
    [switch]$Quick,
    [Alias('Status')][switch]$ShowStatus,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$Help,
    [switch]$WithMonitoring,
    [switch]$MonitoringOnly,
    [switch]$StopMonitoring
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

function Stop-NativeProcessFromFile {
    param(
        [string]$PidFile,
        [string]$Role
    )

    $result = [pscustomobject]@{
        ActionTaken = $false
        Success = $true
        Pid = $null
    }

    if (-not (Test-Path $PidFile)) {
        return $result
    }

    $result.ActionTaken = $true
    try {
        $raw = (Get-Content -LiteralPath $PidFile -Raw).Trim()
    }
    catch {
        Write-Warning2 "Unable to read $Role PID file at ${PidFile}: $($_.Exception.Message)"
        return $result
    }

    if (-not $raw) {
        Write-Warning2 "$Role PID file is empty ($PidFile). Removing it."
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $result
    }

    $parsedPid = 0
    if (-not [int]::TryParse($raw, [ref]$parsedPid)) {
        Write-Warning2 "Invalid PID '$raw' found for $Role. Removing $PidFile."
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $result
    }

    $pidValue = $parsedPid
    $result.Pid = $pidValue
    $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Info "$Role process (PID $pidValue) is no longer running. Cleaning up PID file."
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $result
    }

    try {
        Write-Info "Stopping $Role (PID $pidValue)..."
        try {
            Stop-Process -Id $pidValue -ErrorAction Stop
        }
        catch {
            Write-Warning2 "$Role did not stop gracefully; forcing termination."
            Stop-Process -Id $pidValue -Force -ErrorAction Stop
        }
        try {
            Wait-Process -Id $pidValue -Timeout 10 -ErrorAction SilentlyContinue
        }
        catch {}
        Write-Success "$Role stopped successfully"
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Error2 "Failed to stop $Role (PID $pidValue): $($_.Exception.Message)"
        $result.Success = $false
    }

    return $result
}

function Stop-OrphanNativeProcesses {
    param([int[]]$ExcludePids = @())

    if (-not $IsWindows) {
        return [pscustomobject]@{ ActionTaken = $false; Success = $true }
    }

    try {
        $allProcs = Get-CimInstance Win32_Process -ErrorAction Stop
    }
    catch {
        Write-Warning2 "Unable to inspect host processes for native servers: $($_.Exception.Message)"
        return [pscustomobject]@{ ActionTaken = $false; Success = $false }
    }

    $repoPathPattern = [System.Text.RegularExpressions.Regex]::Escape($scriptDir)
    $targets = @()

    foreach ($proc in $allProcs) {
        if (-not $proc.CommandLine) { continue }
        if ($ExcludePids -contains $proc.ProcessId) { continue }
        if ($proc.CommandLine -notmatch $repoPathPattern) { continue }

        $role = $null
        if ($proc.CommandLine -match 'uvicorn\s+backend\.main:app') {
            $role = 'Backend'
        }
        elseif ($proc.CommandLine -match 'npm run dev' -or $proc.CommandLine -match 'vite(\.js)?') {
            $role = 'Frontend'
        }

        if ($null -ne $role) {
            $targets += [pscustomobject]@{
                Role = $role
                ProcessId = [int]$proc.ProcessId
            }
        }
    }

    if ($targets.Count -eq 0) {
        return [pscustomobject]@{ ActionTaken = $false; Success = $true }
    }

    Write-Warning2 "Detected native processes without PID files; attempting to stop them..."
    $success = $true
    foreach ($target in $targets) {
        try {
            Write-Info "Stopping $($target.Role) (PID $($target.ProcessId))..."
            try {
                Stop-Process -Id $target.ProcessId -ErrorAction Stop
            }
            catch {
                Write-Warning2 "$($target.Role) did not stop gracefully; forcing termination."
                Stop-Process -Id $target.ProcessId -Force -ErrorAction Stop
            }
            try {
                Wait-Process -Id $target.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
            }
            catch {}
            Write-Success "$($target.Role) stopped"
        }
        catch {
            Write-Error2 "Failed to stop $($target.Role) (PID $($target.ProcessId)): $($_.Exception.Message)"
            $success = $false
        }
    }

    return [pscustomobject]@{ ActionTaken = $true; Success = $success }
}

function Stop-NativeProcesses {
    $backendPidFile = Join-Path $scriptDir '.backend.pid'
    $frontendPidFile = Join-Path $scriptDir '.frontend.pid'

    Write-Header "Stopping Native Development Services" 'Yellow'

    $handledPids = @()
    $actionsTaken = $false
    $success = $true

    foreach ($entry in @(
        @{ Role = 'Backend'; File = $backendPidFile },
        @{ Role = 'Frontend'; File = $frontendPidFile }
    )) {
        $result = Stop-NativeProcessFromFile -PidFile $entry.File -Role $entry.Role
        if ($result.ActionTaken) {
            $actionsTaken = $true
            if ($null -ne $result.Pid) { $handledPids += $result.Pid }
        }
        if (-not $result.Success) { $success = $false }
    }

    $orphanResult = Stop-OrphanNativeProcesses -ExcludePids $handledPids

    if ($orphanResult.ActionTaken) {
        $actionsTaken = $true
        if (-not $orphanResult.Success) { $success = $false }
    }

    if (-not $actionsTaken) {
        Write-Info 'No native host services were detected.'
    }

    return $success
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
    Push-Location $scriptDir
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
    finally {
        Pop-Location
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
    Push-Location $scriptDir
    try {
        docker compose down 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Containers stopped successfully"
            return $true
        }
        else {
            Write-Error2 "Failed to stop containers"
            return $false
        }
    }
    catch {
        Write-Error2 "Error stopping containers: $($_.Exception.Message)"
        return $false
    }
    finally {
        Pop-Location
    }
}

function Get-MonitoringStatus {
    <#
    .SYNOPSIS
        Check monitoring stack status
    #>

    if (-not (Test-DockerRunning)) {
        return @{
            Running = $false
            Containers = @()
        }
    }

    try {
        $containers = docker ps --filter "label=com.sms.component=monitoring" --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>$null

        if ($LASTEXITCODE -ne 0 -or -not $containers) {
            return @{
                Running = $false
                Containers = @()
            }
        }

        $containerList = @()
        foreach ($line in $containers) {
            if ($line) {
                $parts = $line -split '\|'
                $containerList += @{
                    Name = $parts[0]
                    Status = $parts[1]
                    Ports = if ($parts.Length -gt 2) { $parts[2] } else { "" }
                    IsRunning = $parts[1] -match "Up"
                }
            }
        }

        return @{
            Running = $containerList.Count -gt 0 -and ($containerList | Where-Object { $_.IsRunning }).Count -gt 0
            Containers = $containerList
        }
    }
    catch {
        return @{
            Running = $false
            Containers = @()
        }
    }
}

function Start-MonitoringStack {
    <#
    .SYNOPSIS
        Start monitoring stack (Prometheus, Grafana, Loki, etc.)
    #>

    Write-Header "Starting Monitoring Stack" "Magenta"

    if (-not (Test-DockerRunning)) {
        Write-Error2 "Docker Desktop is not running"
        Write-Info "Please start Docker Desktop first"
        return $false
    }

    # Check if docker-compose.monitoring.yml exists
    $monitoringCompose = Join-Path $scriptDir "docker-compose.monitoring.yml"
    if (-not (Test-Path $monitoringCompose)) {
        Write-Error2 "Monitoring configuration not found: docker-compose.monitoring.yml"
        Write-Info "Please ensure the monitoring stack is properly configured"
        return $false
    }

    Write-Info "Starting monitoring services..."
    Write-Info "  - Prometheus (metrics)"
    Write-Info "  - Grafana (dashboards)"
    Write-Info "  - Loki (logs)"
    Write-Info "  - AlertManager (alerts)"
    Write-Info "  - Node Exporter (system metrics)"
    Write-Info "  - cAdvisor (container metrics)"

    Push-Location $scriptDir
    try {
        docker compose -f docker-compose.monitoring.yml up -d 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Monitoring stack started successfully"
            Write-Host ""
            Write-Host "Access monitoring services:" -ForegroundColor Yellow
            Write-Host "  Grafana:      " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:3000" -ForegroundColor Cyan -NoNewline
            Write-Host " (admin/admin)" -ForegroundColor DarkGray
            Write-Host "  Prometheus:   " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:9090" -ForegroundColor Cyan
            Write-Host "  AlertManager: " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:9093" -ForegroundColor Cyan
            Write-Host "  Metrics:      " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:8000/metrics" -ForegroundColor Cyan
            Write-Host ""
            return $true
        }
        else {
            Write-Error2 "Failed to start monitoring stack"
            return $false
        }
    }
    catch {
        Write-Error2 "Error starting monitoring: $($_.Exception.Message)"
        return $false
    }
    finally {
        Pop-Location
    }
}

function Stop-MonitoringStack {
    <#
    .SYNOPSIS
        Stop monitoring stack
    #>

    Write-Header "Stopping Monitoring Stack" "Yellow"

    if (-not (Test-DockerRunning)) {
        Write-Warning2 "Docker Desktop is not running (monitoring already stopped)"
        return $true
    }

    Write-Info "Stopping monitoring services..."
    Push-Location $scriptDir
    try {
        docker compose -f docker-compose.monitoring.yml down 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Monitoring stack stopped successfully"
            return $true
        }
        else {
            Write-Error2 "Failed to stop monitoring stack"
            return $false
        }
    }
    catch {
        Write-Error2 "Error stopping monitoring: $($_.Exception.Message)"
        return $false
    }
    finally {
        Pop-Location
    }
}

function Show-MonitoringStatus {
    <#
    .SYNOPSIS
        Display monitoring stack status
    #>

    Write-Header "Monitoring Stack Status" "Magenta"

    $status = Get-MonitoringStatus

    if (-not (Test-DockerRunning)) {
        Write-Error2 "Docker Desktop is not running"
        return
    }

    if ($status.Containers.Count -eq 0) {
        Write-Warning2 "No monitoring containers found"
        Write-Info "Run '.\SMS.ps1 -WithMonitoring' to start with monitoring"
        Write-Info "Or run '.\SMS.ps1 -MonitoringOnly' to start monitoring only"
    }
    else {
        Write-Host "Monitoring Services:" -ForegroundColor Yellow
        foreach ($container in $status.Containers) {
            $statusColor = if ($container.IsRunning) { "Green" } else { "Red" }
            $statusIcon = if ($container.IsRunning) { "✓" } else { "✗" }

            $serviceName = $container.Name -replace '^sms-', ''
            Write-Host "  $statusIcon " -ForegroundColor $statusColor -NoNewline
            Write-Host $serviceName -ForegroundColor White
            Write-Host "     Status: " -ForegroundColor Gray -NoNewline
            Write-Host "$($container.Status)" -ForegroundColor $statusColor
        }

        Write-Host ""

        $runningContainers = $status.Containers | Where-Object { $_.IsRunning }
        if ($runningContainers.Count -gt 0) {
            Write-Host "Access URLs:" -ForegroundColor Yellow
            Write-Host "  Grafana:      " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:3000" -ForegroundColor Cyan
            Write-Host "  Prometheus:   " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:9090" -ForegroundColor Cyan
            Write-Host "  AlertManager: " -ForegroundColor Gray -NoNewline
            Write-Host "http://localhost:9093" -ForegroundColor Cyan
        }
    }

    Write-Host ""
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
    Push-Location $scriptDir
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
    finally {
        Pop-Location
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

    Push-Location $scriptDir
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
    finally {
        Pop-Location
    }
}

function Show-Help {
    <#
    .SYNOPSIS
        Display help information
    #>

    Write-Header "Student Management System v$version - Help" "Cyan"

    Write-Host @"
Docker-only Release - Simple Container Management + Monitoring

USAGE:
  .\SMS.ps1 [OPTIONS]

OPTIONS:
  -Quick              Start containers immediately
  -WithMonitoring     Start containers with monitoring stack
  -MonitoringOnly     Start monitoring stack only
  -Status             Show container and monitoring status
  -Stop               Stop all containers (app + monitoring)
  -StopMonitoring     Stop monitoring stack only
  -Restart            Restart all containers
  -Logs               Show backend container logs
  -Help               Show this help message

EXAMPLES:
  .\SMS.ps1                        # Interactive mode (show status)
  .\SMS.ps1 -Quick                 # Quick start (app only)
  .\SMS.ps1 -WithMonitoring        # Start app + monitoring
  .\SMS.ps1 -MonitoringOnly        # Start monitoring only
  .\SMS.ps1 -Stop                  # Stop everything
  .\SMS.ps1 -StopMonitoring        # Stop monitoring only
  .\SMS.ps1 -Restart               # Restart containers
  .\SMS.ps1 -Logs                  # View logs

FIRST TIME SETUP:
  .\SMART_SETUP.ps1                # Initialize and start the system
  .\SMART_SETUP.ps1 -WithMonitoring # Initialize with monitoring

MONITORING STACK:
  When started, provides:
  • Grafana Dashboard:   http://localhost:3000 (admin/admin)
  • Prometheus Metrics:  http://localhost:9090
  • AlertManager:        http://localhost:9093
  • Application Metrics: http://localhost:8000/metrics

  See MONITORING_QUICKSTART.md for setup guide

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

  # Monitoring
  docker compose -f docker-compose.monitoring.yml up -d    # Start monitoring
  docker compose -f docker-compose.monitoring.yml down     # Stop monitoring

SUPPORT:
  • Documentation: ./docs/
  • Monitoring Guide: ./docs/operations/MONITORING.md
  • Quick Start: ./MONITORING_QUICKSTART.md
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
Write-Host "║     Student Management System - Environment Management Suite      ║" -ForegroundColor Cyan
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
    Show-MonitoringStatus
    exit 0
}

if ($StopMonitoring) {
    $success = Stop-MonitoringStack
    exit $(if ($success) { 0 } else { 1 })
}

if ($Stop) {
    $nativeSuccess = Stop-NativeProcesses
    $dockerSuccess = Stop-Containers

    # Also stop monitoring if it's running
    $monitoringStatus = Get-MonitoringStatus
    if ($monitoringStatus.Running) {
        Write-Host ""
        $null = Stop-MonitoringStack
    }

    $overall = $nativeSuccess -and $dockerSuccess
    exit $(if ($overall) { 0 } else { 1 })
}

if ($Restart) {
    $success = Restart-Containers
    exit $(if ($success) { 0 } else { 1 })
}

if ($MonitoringOnly) {
    $success = Start-MonitoringStack
    if ($success) {
        Write-Host ""
        Show-MonitoringStatus
    }
    exit $(if ($success) { 0 } else { 1 })
}

if ($Quick -or $WithMonitoring) {
    $success = Start-Containers

    if ($success -and $WithMonitoring) {
        Write-Host ""
        $monSuccess = Start-MonitoringStack
        $success = $success -and $monSuccess
    }

    exit $(if ($success) { 0 } else { 1 })
}

if ($Logs) {
    Show-Logs
    exit 0
}

# Interactive mode (default)
Show-Status

# Also show monitoring status if any monitoring containers exist
$monitoringStatus = Get-MonitoringStatus
if ($monitoringStatus.Containers.Count -gt 0) {
    Show-MonitoringStatus
}

Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "  .\SMS.ps1 -Quick            # Start containers" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -WithMonitoring   # Start with monitoring stack" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -MonitoringOnly   # Start monitoring only" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Stop             # Stop everything" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -StopMonitoring   # Stop monitoring only" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Restart          # Restart containers" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Logs             # View logs" -ForegroundColor Gray
Write-Host "  .\SMS.ps1 -Help             # Full help" -ForegroundColor Gray
Write-Host ""
