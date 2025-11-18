# Monitoring Stack Watcher Service
# Watches for trigger files and automatically starts monitoring stack

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [int]$PollInterval = 2  # Check every 2 seconds
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$TRIGGER_DIR = Join-Path $PROJECT_ROOT "data\.triggers"
$TRIGGER_FILE = Join-Path $TRIGGER_DIR "start_monitoring.ps1"
$PID_FILE = Join-Path $TRIGGER_DIR "watcher.pid"
$LOG_FILE = Join-Path $PROJECT_ROOT "logs\monitoring-watcher.log"

# Ensure log directory exists
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logMessage
    Write-Host $logMessage
}

function Start-Watcher {
    Write-Log "Starting monitoring watcher service..."
    
    # Check if already running
    if (Test-Path $PID_FILE) {
        $existingPid = Get-Content $PID_FILE
        if (Get-Process -Id $existingPid -ErrorAction SilentlyContinue) {
            Write-Log "Watcher already running (PID: $existingPid)" "WARN"
            return
        }
    }
    
    # Start watcher in background
    $job = Start-Job -ScriptBlock {
        param($TriggerFile, $ProjectRoot, $LogFile, $Interval)
        
        function Write-JobLog {
            param([string]$Message, [string]$Level = "INFO")
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logMessage = "[$timestamp] [$Level] $Message"
            Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
        }
        
        Write-JobLog "Watcher started, monitoring: $TriggerFile"
        
        while ($true) {
            try {
                if (Test-Path $TriggerFile) {
                    Write-JobLog "Trigger detected! Starting monitoring stack..."
                    
                    # Execute the monitoring start
                    Push-Location $ProjectRoot
                    try {
                        $output = docker compose -f docker-compose.monitoring.yml up -d 2>&1 | Out-String
                        
                        # Check if main containers are running (exit code can be non-zero due to warnings)
                        $grafanaRunning = docker ps -q -f name=sms-grafana -f status=running
                        $prometheusRunning = docker ps -q -f name=sms-prometheus -f status=running
                        
                        if ($grafanaRunning -and $prometheusRunning) {
                            Write-JobLog "✅ Monitoring stack started successfully"
                            Write-JobLog "Grafana: http://localhost:3000"
                            Write-JobLog "Prometheus: http://localhost:9090"
                            
                            # Remove trigger file
                            Remove-Item $TriggerFile -Force -ErrorAction SilentlyContinue
                            Write-JobLog "Trigger file cleaned up"
                        } else {
                            Write-JobLog "❌ Failed to start monitoring - containers not running: $output" "ERROR"
                        }
                    } catch {
                        Write-JobLog "❌ Exception starting monitoring: $_" "ERROR"
                    } finally {
                        Pop-Location
                    }
                }
                
                Start-Sleep -Seconds $Interval
            } catch {
                Write-JobLog "Error in watcher loop: $_" "ERROR"
                Start-Sleep -Seconds $Interval
            }
        }
    } -ArgumentList $TRIGGER_FILE, $PROJECT_ROOT, $LOG_FILE, $PollInterval
    
    # Save PID
    $job.Id | Set-Content $PID_FILE
    Write-Log "Watcher started (Job ID: $($job.Id))"
    Write-Log "Logs: $LOG_FILE"
    
    return $job
}

function Stop-Watcher {
    Write-Log "Stopping monitoring watcher service..."
    
    if (-not (Test-Path $PID_FILE)) {
        Write-Log "Watcher not running (no PID file)" "WARN"
        return
    }
    
    $jobId = Get-Content $PID_FILE
    $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
    
    if ($job) {
        Stop-Job -Job $job
        Remove-Job -Job $job -Force
        Write-Log "Watcher stopped (Job ID: $jobId)"
    } else {
        Write-Log "Watcher job not found (ID: $jobId)" "WARN"
    }
    
    Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
}

function Get-WatcherStatus {
    if (-not (Test-Path $PID_FILE)) {
        Write-Host "❌ Watcher: Not running" -ForegroundColor Red
        return $false
    }
    
    $jobId = Get-Content $PID_FILE
    $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
    
    if ($job -and $job.State -eq 'Running') {
        Write-Host "✅ Watcher: Running (Job ID: $jobId)" -ForegroundColor Green
        Write-Host "   Monitoring: $TRIGGER_DIR"
        Write-Host "   Logs: $LOG_FILE"
        return $true
    } else {
        Write-Host "❌ Watcher: Not running (stale PID file)" -ForegroundColor Red
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# Main execution
if ($Install) {
    Write-Host "Installing monitoring watcher as a background service..."
    Start-Watcher
    Write-Host ""
    Write-Host "✅ Watcher installed and started" -ForegroundColor Green
    Write-Host "   The watcher will automatically start monitoring when triggers are created."
    Write-Host ""
    Write-Host "To check status: .\scripts\monitoring-watcher.ps1 -Status"
    Write-Host "To stop: .\scripts\monitoring-watcher.ps1 -Stop"
}
elseif ($Uninstall -or $Stop) {
    Stop-Watcher
}
elseif ($Start) {
    Start-Watcher
}
elseif ($Status) {
    Get-WatcherStatus
}
else {
    Write-Host @"
Monitoring Stack Watcher Service
Automatically starts monitoring when UI triggers are created.

Usage:
  .\scripts\monitoring-watcher.ps1 -Install    # Install and start watcher
  .\scripts\monitoring-watcher.ps1 -Start      # Start watcher
  .\scripts\monitoring-watcher.ps1 -Stop       # Stop watcher
  .\scripts\monitoring-watcher.ps1 -Status     # Check status

The watcher monitors: $TRIGGER_DIR
When a trigger file is detected, it automatically runs:
  docker compose -f docker-compose.monitoring.yml up -d

Logs are written to: $LOG_FILE
"@
}
