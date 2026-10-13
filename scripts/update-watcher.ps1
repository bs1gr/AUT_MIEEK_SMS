# Host updater task for the Docker edition.
#
# The Control Panel's Update (inside the container) writes data\.triggers\update_request_<job>.json;
# DOCKER.ps1 mounts that folder into the container. This task, running on the host, then installs
# the latest release:
#   1. read the latest release from GitHub and pick SMS_Installer_<version>.exe;
#   2. download it and check it against the release's SHA-256 digest and its AUT MIEEK signature;
#   3. run it silently as the Docker edition (/EDITION=docker), which replaces the sources;
#   4. rebuild and start the container with DOCKER.ps1 -Update.
# Progress goes to data\.triggers\update_status_<job>.json, which the app reads when it is back.
#
# Only the job id is taken from the request file (validated: 32 hex digits). What runs is decided
# here, so a file written from inside the container can never choose a command to run on the host.
#
# The installer registers this script as a scheduled task (-Install): at logon of the installing
# user, with highest privileges (the installer needs them), interactive (no stored password;
# Docker Desktop only runs while that user is logged on anyway). It writes a heartbeat file every
# few seconds; the app offers the one-click Update only while the heartbeat is recent.
#
# Windows PowerShell 5.1 compatible (the task runs powershell.exe).

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$RunLoop,
    [switch]$Install,
    [switch]$Uninstall,
    [int]$PollInterval = 3
)

$ErrorActionPreference = 'Stop'
$SELF_PATH = $PSCommandPath
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$TRIGGER_DIR = Join-Path $PROJECT_ROOT "data\.triggers"
$TRIGGER_PATTERN = "update_request_*.json"
$HEARTBEAT_FILE = Join-Path $TRIGGER_DIR "update_watcher_heartbeat.json"
$PID_FILE = Join-Path $TRIGGER_DIR "update-watcher.pid"
$LOG_FILE = Join-Path $PROJECT_ROOT "logs\update-watcher.log"
$DOWNLOAD_DIR = Join-Path $PROJECT_ROOT "data\updates"
$TASK_NAME = "SMS Update Watcher"
$RELEASE_API = "https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases/latest"
$SIGNER_PATTERN = 'CN=AUT MIEEK\b'
$JOB_ID_PATTERN = '^[0-9a-f]{32}$'

foreach ($dir in @((Split-Path -Parent $LOG_FILE), $TRIGGER_DIR)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -Path $LOG_FILE -Value $line
    Write-Host $line
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
        'job_id'           = $JobId
        'status'           = $Status
        'phase'            = $Phase
        'progress_percent' = $Progress
        'message'          = $Message
        'error'            = $(if ($FailureText) { $FailureText } else { $null })
        'target_version'   = $(if ($TargetVersion) { $TargetVersion } else { $null })
        'updated_at'       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $payload | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $TRIGGER_DIR ("update_status_{0}.json" -f $JobId)) -Encoding UTF8
}

function Write-Heartbeat {
    $beat = [ordered]@{
        'pid'        = $PID
        'updated_at' = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $beat | ConvertTo-Json | Set-Content -Path $HEARTBEAT_FILE -Encoding UTF8
}

function Get-InstalledVersion {
    $versionFile = Join-Path $PROJECT_ROOT 'VERSION'
    if (Test-Path $versionFile) { return ((Get-Content $versionFile -Raw).Trim() -replace '^v', '') }
    return '0.0.0'
}

function Get-PowerShellForDocker {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    return (Get-Command powershell).Source
}

function Install-LatestRelease {
    param([string]$JobId)

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-StatusFile -JobId $JobId -Status "running" -Phase "fetch_release" -Progress 5 -Message "Reading the latest release."
    $release = Invoke-RestMethod -Uri $RELEASE_API -Headers @{ 'User-Agent' = 'SMS-Update-Watcher'; 'Accept' = 'application/vnd.github+json' }
    $target = ([string]$release.tag_name) -replace '^v', ''
    $installed = Get-InstalledVersion
    if (-not $target -or ([version]$target -le [version]$installed)) {
        Write-StatusFile -JobId $JobId -Status "completed" -Phase "up_to_date" -Progress 100 -Message "Version $installed is already the latest release." -TargetVersion $installed
        return $false
    }

    $asset = @($release.assets | Where-Object { $_.name -match '^SMS_Installer_.*\.exe$' }) | Select-Object -First 1
    if (-not $asset) { throw "Release $target has no SMS_Installer_*.exe asset." }
    $digest = [string]$asset.digest
    if ($digest -notmatch '^sha256:([0-9a-fA-F]{64})$') { throw "Release $target publishes no SHA-256 digest for $($asset.name); not installing it." }
    $expected = $Matches[1].ToLower()

    if (-not (Test-Path $DOWNLOAD_DIR)) { New-Item -ItemType Directory -Path $DOWNLOAD_DIR -Force | Out-Null }
    $installer = Join-Path $DOWNLOAD_DIR $asset.name
    Write-StatusFile -JobId $JobId -Status "running" -Phase "downloading" -Progress 15 -Message "Downloading $($asset.name)." -TargetVersion $target
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer -UseBasicParsing

    Write-StatusFile -JobId $JobId -Status "running" -Phase "verifying" -Progress 45 -Message "Checking the installer's SHA-256 and signature." -TargetVersion $target
    $actual = (Get-FileHash -Path $installer -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $expected) {
        Remove-Item $installer -Force -ErrorAction SilentlyContinue
        throw "SHA-256 mismatch: expected $expected, got $actual."
    }
    $signature = Get-AuthenticodeSignature -FilePath $installer
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch $SIGNER_PATTERN) {
        Remove-Item $installer -Force -ErrorAction SilentlyContinue
        throw "The installer is not validly signed by AUT MIEEK (status: $($signature.Status))."
    }

    Write-StatusFile -JobId $JobId -Status "running" -Phase "installing" -Progress 55 -Message "Installing $target (Docker edition)." -TargetVersion $target
    $setupLog = Join-Path $PROJECT_ROOT ("logs\update-install-{0}.log" -f $target)
    $setup = Start-Process -FilePath $installer -Wait -PassThru -ArgumentList @(
        '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-', '/EDITION=docker', "/LOG=`"$setupLog`""
    )
    if ($setup.ExitCode -ne 0) { throw "The installer exited with code $($setup.ExitCode); see $setupLog." }

    Write-StatusFile -JobId $JobId -Status "running" -Phase "rebuilding" -Progress 75 -Message "Rebuilding and starting the container." -TargetVersion $target
    $docker = Start-Process -FilePath (Get-PowerShellForDocker) -Wait -PassThru -WorkingDirectory $PROJECT_ROOT -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PROJECT_ROOT 'DOCKER.ps1'), '-Update'
    )
    if ($docker.ExitCode -ne 0) { throw "DOCKER.ps1 -Update exited with code $($docker.ExitCode)." }

    Write-StatusFile -JobId $JobId -Status "completed" -Phase "bridge_completed" -Progress 100 -Message "Updated to $target." -TargetVersion $target
    Write-Log "Updated to $target (job $JobId)"
    return $true
}

function Process-UpdateRequests {
    $requests = Get-ChildItem -Path $TRIGGER_DIR -Filter $TRIGGER_PATTERN -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime
    $updated = $false
    foreach ($requestFile in $requests) {
        $jobId = $requestFile.BaseName -replace '^update_request_', ''
        Remove-Item $requestFile.FullName -Force -ErrorAction SilentlyContinue
        if ($jobId -notmatch $JOB_ID_PATTERN) {
            Write-Log "Ignoring request file with an invalid job id: $($requestFile.Name)" "WARN"
            continue
        }
        try {
            Write-Log "Update requested (job $jobId)"
            if (Install-LatestRelease -JobId $jobId) { $updated = $true }
        }
        catch {
            $message = "Update failed: $($_.Exception.Message)"
            Write-Log "$message (job $jobId)" "ERROR"
            Write-StatusFile -JobId $jobId -Status "failed" -Phase "bridge_failed" -Progress 100 -Message $message -FailureText $_.Exception.ToString()
        }
    }
    return $updated
}

function Invoke-WatcherLoop {
    # One watcher at a time (the scheduled task and a manual -Start must not both run)
    $created = $false
    $mutex = [System.Threading.Mutex]::new($true, 'Global\SMS_UpdateWatcher', [ref]$created)
    if (-not $created) {
        Write-Log "Another update watcher is already running; exiting." "WARN"
        return
    }
    Write-Log "Update watcher started (PID: $PID), watching $TRIGGER_DIR"
    try {
        while ($true) {
            try {
                Write-Heartbeat
                if (Process-UpdateRequests) {
                    # The installer just replaced this script: continue with the new copy.
                    Write-Log "Restarting the watcher after the update"
                    $mutex.ReleaseMutex()
                    Start-Process -FilePath (Get-Command powershell).Source -WindowStyle Hidden -ArgumentList @(
                        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $SELF_PATH, '-RunLoop'
                    ) | Out-Null
                    return
                }
            }
            catch {
                Write-Log "Watcher loop error: $($_.Exception.Message)" "ERROR"
            }
            Start-Sleep -Seconds $PollInterval
        }
    }
    finally {
        try { $mutex.Dispose() } catch { }
    }
}

function Install-WatcherTask {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -RunLoop' -f $SELF_PATH)
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Log "Scheduled task '$TASK_NAME' registered for $user"
    try {
        Start-ScheduledTask -TaskName $TASK_NAME
        Write-Log "Scheduled task '$TASK_NAME' started"
    }
    catch {
        Write-Log "Scheduled task registered; it starts at the next logon ($($_.Exception.Message))" "WARN"
    }
}

function Uninstall-WatcherTask {
    $task = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    if ($task) {
        Stop-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false
        Write-Log "Scheduled task '$TASK_NAME' removed"
    }
    Remove-Item $HEARTBEAT_FILE -Force -ErrorAction SilentlyContinue
}

function Get-RunningWatcherProcess {
    if (-not (Test-Path $PID_FILE)) { return $null }
    $watcherPid = 0
    if (-not [int]::TryParse((Get-Content $PID_FILE -Raw).Trim(), [ref]$watcherPid)) {
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        return $null
    }
    $proc = Get-Process -Id $watcherPid -ErrorAction SilentlyContinue
    if (-not $proc) { Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue }
    return $proc
}

if ($Install) { Install-WatcherTask; exit 0 }
if ($Uninstall) { Uninstall-WatcherTask; exit 0 }
if ($RunLoop) { Invoke-WatcherLoop; exit 0 }
if ($Start) {
    if (Get-RunningWatcherProcess) { Write-Log "Update watcher already running" "WARN"; exit 0 }
    $proc = Start-Process -FilePath (Get-Command powershell).Source -WindowStyle Hidden -PassThru -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $SELF_PATH, '-RunLoop', '-PollInterval', $PollInterval
    )
    $proc.Id | Set-Content $PID_FILE
    Write-Log "Update watcher started (PID: $($proc.Id))"
    exit 0
}
if ($Stop) {
    $proc = Get-RunningWatcherProcess
    if ($proc) { Stop-Process -Id $proc.Id -Force; Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue; Write-Log "Update watcher stopped" }
    exit 0
}
if ($Status) {
    $task = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    $fresh = (Test-Path $HEARTBEAT_FILE) -and (((Get-Date) - (Get-Item $HEARTBEAT_FILE).LastWriteTime).TotalSeconds -le 90)
    Write-Host ("Scheduled task: {0}" -f $(if ($task) { $task.State } else { 'not registered' }))
    Write-Host ("Heartbeat recent: {0}" -f $fresh)
    exit $(if ($fresh) { 0 } else { 1 })
}

Write-Host @"
SMS host updater task (Docker edition)
  -Install     register the scheduled task (the installer does this) and start it
  -Uninstall   remove the scheduled task
  -Status      task state and whether its heartbeat is recent
  -RunLoop     the watcher loop itself (what the task runs)
  -Start/-Stop run the loop by hand without the task
"@
