# Host Updater Watcher Service
# Watches update trigger files created by the containerized backend and executes DOCKER.ps1 -UpdateClean on host.

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$RunLoop,
    [int]$PollInterval = 2
)

$ErrorActionPreference = 'Stop'
$SELF_PATH = $PSCommandPath
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$TRIGGER_DIR = Join-Path $PROJECT_ROOT "data\.triggers"
$TRIGGER_PATTERN = "update_request_*.json"
$PID_FILE = Join-Path $TRIGGER_DIR "update-watcher.pid"
$LOG_FILE = Join-Path $PROJECT_ROOT "logs\update-watcher.log"

$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
if (-not (Test-Path $TRIGGER_DIR)) {
    New-Item -ItemType Directory -Path $TRIGGER_DIR -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $line
    Write-Host $line
}

function Get-StatusFilePath {
    param([string]$JobId)
    return (Join-Path $TRIGGER_DIR ("update_status_{0}.json" -f $JobId))
}

function Write-StatusFile {
    param(
        [string]$JobId,
        [string]$Status,
        [string]$Phase,
        [int]$Progress,
        [string]$Message,
        [string]$FailureText = "",
        [string]$TargetVersion = ""
    )

    $payload = [ordered]@{
        'job_id' = $JobId
        'status' = $Status
        'phase' = $Phase
        'progress_percent' = $Progress
        'message' = $Message
        'error' = $(if ($FailureText) { $FailureText } else { $null })
        'target_version' = $(if ($TargetVersion) { $TargetVersion } else { $null })
        'updated_at' = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }

    $statusFile = Get-StatusFilePath -JobId $JobId
    $payload | ConvertTo-Json -Depth 5 | Set-Content -Path $statusFile -Encoding UTF8
}

function Process-UpdateRequests {
    $requests = Get-ChildItem -Path $TRIGGER_DIR -Filter $TRIGGER_PATTERN -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime

    foreach ($requestFile in $requests) {
        $jobId = ""
        try {
            $content = Get-Content $requestFile.FullName -Raw -ErrorAction Stop
            $request = $content | ConvertFrom-Json -ErrorAction Stop
            $jobId = [string]$request.job_id
            if (-not $jobId) {
                $jobId = $requestFile.BaseName -replace '^update_request_', ''
            }

            Write-Log "Processing update request for job: $jobId"
            Write-StatusFile -JobId $jobId -Status "running" -Phase "bridge_executing" -Progress 20 -Message "Host watcher executing DOCKER.ps1 -UpdateClean"

            Push-Location $PROJECT_ROOT
            try {
                $cmdOutput = & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PROJECT_ROOT 'DOCKER.ps1') -UpdateClean 2>&1 | Out-String
                $exitCode = $LASTEXITCODE
            }
            finally {
                Pop-Location
            }

            if ($exitCode -eq 0) {
                $targetVersion = ""
                $versionFile = Join-Path $PROJECT_ROOT 'VERSION'
                if (Test-Path $versionFile) {
                    $targetVersion = (Get-Content $versionFile -Raw).Trim()
                }

                Write-Log "Update completed successfully for job $jobId"
                if ($cmdOutput) {
                    $snippet = if ($cmdOutput.Length -gt 500) { $cmdOutput.Substring($cmdOutput.Length - 500) } else { $cmdOutput }
                    Write-Log "DOCKER.ps1 output tail: $snippet"
                }
                Write-StatusFile -JobId $jobId -Status "completed" -Phase "bridge_completed" -Progress 100 -Message "Host update completed successfully." -TargetVersion $targetVersion
            }
            else {
                $msg = "Host update failed (exit code: $exitCode)."
                Write-Log "$msg Job: $jobId" "ERROR"
                $errTail = if ($cmdOutput.Length -gt 1200) { $cmdOutput.Substring($cmdOutput.Length - 1200) } else { $cmdOutput }
                Write-StatusFile -JobId $jobId -Status "failed" -Phase "bridge_failed" -Progress 100 -Message $msg -FailureText $errTail
            }
        }
        catch {
            $resolvedJobId = if ($jobId) { $jobId } else { ($requestFile.BaseName -replace '^update_request_', '') }
            $message = "Watcher processing failed: $($_.Exception.Message)"
            Write-Log "$message (job: $resolvedJobId)" "ERROR"
            Write-StatusFile -JobId $resolvedJobId -Status "failed" -Phase "bridge_failed" -Progress 100 -Message $message -FailureText $_.Exception.ToString()
        }
        finally {
            Remove-Item $requestFile.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-WatcherLoop {
    Write-Log "Update watcher run-loop started (PID: $PID)"
    while ($true) {
        try {
            Process-UpdateRequests
            Start-Sleep -Seconds $PollInterval
        }
        catch {
            Write-Log "Watcher loop error: $($_.Exception.Message)" "ERROR"
            Start-Sleep -Seconds $PollInterval
        }
    }
}

function Get-RunningWatcherProcess {
    if (-not (Test-Path $PID_FILE)) {
        return $null
    }

    $pidText = (Get-Content $PID_FILE -Raw).Trim()
    if (-not $pidText) {
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        return $null
    }

    $watcherPid = 0
    if (-not [int]::TryParse($pidText, [ref]$watcherPid)) {
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        return $null
    }

    $proc = Get-Process -Id $watcherPid -ErrorAction SilentlyContinue
    if (-not $proc) {
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        return $null
    }

    return $proc
}

function Start-Watcher {
    Write-Log "Starting update watcher service..."

    $existing = Get-RunningWatcherProcess
    if ($existing) {
        Write-Log "Update watcher already running (PID: $($existing.Id))" "WARN"
        return
    }

    $args = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $SELF_PATH,
        '-RunLoop',
        '-PollInterval', $PollInterval
    )

    $proc = Start-Process -FilePath 'pwsh' -ArgumentList $args -WindowStyle Hidden -PassThru
    $proc.Id | Set-Content $PID_FILE

    Write-Log "Update watcher started (PID: $($proc.Id))"
    Write-Log "Trigger directory: $TRIGGER_DIR"
    Write-Log "Log file: $LOG_FILE"
}

function Stop-Watcher {
    Write-Log "Stopping update watcher service..."
    $proc = Get-RunningWatcherProcess
    if (-not $proc) {
        Write-Log "Update watcher not running" "WARN"
        return
    }

    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
    Write-Log "Update watcher stopped (PID: $($proc.Id))"
}

function Show-Status {
    $proc = Get-RunningWatcherProcess
    if ($proc) {
        Write-Host "✅ Update watcher: Running (PID: $($proc.Id))" -ForegroundColor Green
        Write-Host "   Trigger directory: $TRIGGER_DIR"
        Write-Host "   Log file: $LOG_FILE"
        return $true
    }

    Write-Host "❌ Update watcher: Not running" -ForegroundColor Red
    return $false
}

if ($RunLoop) {
    Invoke-WatcherLoop
}
elseif ($Start) {
    Start-Watcher
}
elseif ($Stop) {
    Stop-Watcher
}
elseif ($Status) {
    Show-Status
}
else {
    Write-Host @"
Host Update Watcher Service
Monitors data\.triggers\update_request_*.json and executes DOCKER.ps1 -UpdateClean on the host.

Usage:
  .\scripts\update-watcher.ps1 -Start
  .\scripts\update-watcher.ps1 -Stop
  .\scripts\update-watcher.ps1 -Status

Optional:
  -PollInterval <seconds>   # default 2
"@
}
