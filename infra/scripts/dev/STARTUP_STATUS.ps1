<#
.SYNOPSIS
    Shows what the native backend is actually doing while it starts, until it answers /health.

.DESCRIPTION
    The backend needs anything from a few seconds to two minutes before it accepts connections
    (cold imports, router registration, database migrations). Until then the frontend proxy only
    reports ECONNREFUSED. This script reports the real stage instead of a blind wait:

      process alive -> reload worker spawned -> startup lines in logs\app.log -> port open -> /health

    It only reads: the PID file, the process list, the tail of the log, the port and /health.
    NATIVE.ps1 runs it after starting the services; it can also be run on its own at any time.

.PARAMETER BackendPort
    Backend port (default 8000).

.PARAMETER FrontendPort
    Also wait for the Vite dev server on this port. 0 (default) = backend only.

.PARAMETER BackendPid
    PID of the process NATIVE.ps1 started. 0 (default) = read .backend.pid from the project root.

.PARAMETER LogPath
    Backend log file. Default: <project root>\logs\app.log.

.PARAMETER TimeoutSec
    Give up after this many seconds (default 300).

.PARAMETER Once
    Report the current state once and return instead of waiting.

.NOTES
    Exit codes: 0 = ready, 1 = the backend stopped during startup, 2 = not ready (timeout / -Once).
    Kept ASCII-only so it also parses under Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 0,
    [int]$BackendPid = 0,
    [string]$LogPath,
    [int]$TimeoutSec = 300,
    [switch]$Once
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Same root detection as NATIVE.ps1: next to VERSION when installed, else infra/scripts/dev.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $scriptDir 'VERSION')) {
    $projectRoot = $scriptDir
} else {
    $projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
}
if (-not $LogPath) { $LogPath = Join-Path $projectRoot 'logs\app.log' }

# Startup stages in order. A stage with a Marker begins when that text is logged by the backend
# (src/backend: logging_config, router_registry, app_factory, scripts/migrate/runner).
# test_startup_status_ps1.py fails if one of these messages is renamed there.
$Stages = @(
    @{ Name = 'Starting Python and uvicorn';          Marker = $null }
    @{ Name = 'Importing application modules';        Marker = $null }   # reload worker spawned
    @{ Name = 'Registering API routers';              Marker = 'Logging initialized' }
    @{ Name = 'Assembling the application';           Marker = 'Registered routers:' }
    @{ Name = 'Starting services';                    Marker = 'FastAPI application created successfully' }
    @{ Name = 'Checking database migrations';         Marker = '[run_migrations] ENTER' }
    @{ Name = 'Port open, waiting for health check';  Marker = $null }
)
$StageWorker = 1
$StageListening = $Stages.Count - 1

function Get-PidFromFile {
    param([string]$Name)
    $file = Join-Path $projectRoot $Name
    if (-not (Test-Path -LiteralPath $file)) { return 0 }
    $parsed = 0
    if ([int]::TryParse(([string](Get-Content -LiteralPath $file -Raw)).Trim(), [ref]$parsed)) { return $parsed }
    return 0
}

function Get-StartTime {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return $null }
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) { return $null }
    try { return $proc.StartTime } catch { return $null }
}

function Test-TcpOpen {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $attempt = $client.ConnectAsync('127.0.0.1', $Port)
        return ($attempt.Wait(300) -and $client.Connected)
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-Prop {
    param($Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    $prop = $Object.PSObject.Properties[$Name]
    if ($prop) { return $prop.Value }
    return $null
}

function Get-Health {
    # Any HTTP answer means the server is up; an unhealthy check is reported, not waited on.
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 5 -ErrorAction Stop
        try { return ($response.Content | ConvertFrom-Json) } catch { return [pscustomobject]@{ status = "HTTP $($response.StatusCode)" } }
    } catch {
        $failed = Get-Prop $_.Exception 'Response'
        if ($failed) { return [pscustomobject]@{ status = "HTTP $([int]$failed.StatusCode)" } }
        return $null
    }
}

function Get-LogStage {
    # Highest stage whose marker was logged since this backend process started.
    param([datetime]$Since)
    if (-not (Test-Path -LiteralPath $LogPath)) { return -1 }
    try {
        $stream = [System.IO.File]::Open($LogPath, 'Open', 'Read', 'ReadWrite')
        try {
            $take = [int][Math]::Min($stream.Length, 65536)
            [void]$stream.Seek(-$take, 'End')
            $buffer = New-Object byte[] $take
            $read = $stream.Read($buffer, 0, $take)
        } finally {
            $stream.Dispose()
        }
    } catch {
        return -1
    }

    $best = -1
    foreach ($line in ([System.Text.Encoding]::UTF8.GetString($buffer, 0, $read) -split "`n")) {
        if ($line -notmatch '^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d),(\d{3}) ') { continue }
        $stamp = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd HH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture).AddMilliseconds([int]$Matches[2])
        if ($stamp -lt $Since) { continue }
        for ($i = $best + 1; $i -lt $Stages.Count; $i++) {
            $marker = $Stages[$i].Marker
            if ($marker -and $line.Contains($marker)) { $best = $i }
        }
    }
    return $best
}

function Test-ReloadWorker {
    # uvicorn --reload runs the app in a multiprocessing child of the process NATIVE.ps1 started.
    param([int]$RootPid)
    try {
        $pythons = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" -Property ProcessId, ParentProcessId, CommandLine -ErrorAction Stop)
    } catch {
        return $false
    }
    $family = @{ $RootPid = $true }
    do {
        $grew = $false
        foreach ($p in $pythons) {
            if ($family.ContainsKey([int]$p.ParentProcessId) -and -not $family.ContainsKey([int]$p.ProcessId)) {
                $family[[int]$p.ProcessId] = $true
                $grew = $true
            }
        }
    } while ($grew)
    foreach ($p in $pythons) {
        if ($family.ContainsKey([int]$p.ProcessId) -and ([string]$p.CommandLine) -match 'multiprocessing') { return $true }
    }
    return $false
}

# --- output: one live line on a console, plain lines when redirected -------------------------
$live = -not [Console]::IsOutputRedirected
$script:liveLength = 0
$check = [string][char]0x2713

function Write-Live {
    param([string]$Text)
    if (-not $live) { return }
    $pad = [Math]::Max(0, $script:liveLength - $Text.Length)
    Write-Host -NoNewline ("`r" + $Text + (' ' * $pad))
    $script:liveLength = $Text.Length
}

function Write-Line {
    param([string]$Text, [string]$Color = 'Gray')
    if ($live -and $script:liveLength -gt 0) {
        Write-Host -NoNewline ("`r" + (' ' * $script:liveLength) + "`r")
        $script:liveLength = 0
    }
    Write-Host $Text -ForegroundColor $Color
}

function Format-Seconds {
    param([double]$Seconds)
    if ($Seconds -lt 10) { return ('{0:0.0}s' -f $Seconds) }
    return ('{0:0}s' -f $Seconds)
}

# --- state ------------------------------------------------------------------------------------
if ($BackendPid -le 0) { $BackendPid = Get-PidFromFile '.backend.pid' }
$scriptStart = Get-Date
$backendStart = Get-StartTime $BackendPid
if (-not $backendStart) {
    # No start time to anchor on: only trust log lines written from now on. A PID that is set
    # but not running is kept, so a closed port is reported as "stopped" instead of waited on.
    $backendStart = $scriptStart
}
if ($BackendPid -le 0) {
    # Nothing was started by NATIVE.ps1, so do not claim that something is starting.
    $Stages[0].Name = "No backend process known, port $BackendPort closed"
}
$frontendStart = Get-StartTime (Get-PidFromFile '.frontend.pid')
if (-not $frontendStart) { $frontendStart = $scriptStart }

$backendReady = $false
$frontendReady = ($FrontendPort -le 0)
$stage = -1
$stageStart = $backendStart
$workerSeen = $false
$workerMisses = 0
$lastTreeCheck = [datetime]::MinValue
$spinner = '|', '/', '-', '\'
$tick = 0
$firstPass = $true

while ($true) {
    $now = Get-Date

    if (-not $backendReady) {
        $portOpen = Test-TcpOpen $BackendPort
        $health = $null
        if ($portOpen) { $health = Get-Health }
        $failure = $null
        $newStage = 0

        if ($health) {
            $backendReady = $true
        } elseif ($portOpen) {
            $newStage = $StageListening
        } else {
            if ($BackendPid -gt 0 -and -not (Get-Process -Id $BackendPid -ErrorAction SilentlyContinue)) {
                $failure = "Backend process (PID $BackendPid) is no longer running"
            } elseif ($BackendPid -gt 0 -and ($now - $lastTreeCheck).TotalSeconds -ge 2) {
                $lastTreeCheck = $now
                if (Test-ReloadWorker $BackendPid) {
                    $workerSeen = $true
                    $workerMisses = 0
                } elseif ($workerSeen) {
                    # The reloader survives a worker that crashed on import and then waits forever.
                    $workerMisses++
                    if ($workerMisses -ge 2) { $failure = 'Backend worker exited during startup (the reloader is still waiting for a file change)' }
                }
            }
            if ($workerSeen) { $newStage = $StageWorker }
            $newStage = [Math]::Max($newStage, (Get-LogStage -Since $backendStart.AddSeconds(-1)))
        }

        if ($failure) {
            Write-Line "  x $failure" 'Red'
            Write-Line "    Stopped at: $($Stages[[Math]::Max($stage, 0)].Name). The backend window shows the error." 'Yellow'
            exit 1
        }

        if ($backendReady) {
            if ($stage -ge 0) {
                Write-Line ("  $check {0} ({1})" -f $Stages[$stage].Name, (Format-Seconds ($now - $stageStart).TotalSeconds)) 'DarkGray'
            }
            $version = Get-Prop $health 'version'
            $overall = Get-Prop $health 'status'
            $database = Get-Prop (Get-Prop $health 'checks') 'database'
            $details = @()
            if ($version) { $details += [string]$version }
            if ($database) { $details += "database $(Get-Prop $database 'dialect'): $(Get-Prop $database 'status')" }
            if ($overall -and $overall -ne 'healthy') { $details += "status: $overall" }
            $suffix = if ($details.Count) { ' - ' + ($details -join ', ') } else { '' }
            $headline = if ($firstPass) { "Backend is up on port $BackendPort" } else { "Backend ready in $(Format-Seconds ($now - $backendStart).TotalSeconds)" }
            $color = if ($overall -and $overall -ne 'healthy') { 'Yellow' } else { 'Green' }
            Write-Line "  $check $headline$suffix" $color
        } elseif ($newStage -gt $stage) {
            if ($stage -ge 0) {
                Write-Line ("  $check {0} ({1})" -f $Stages[$stage].Name, (Format-Seconds ($now - $stageStart).TotalSeconds)) 'DarkGray'
                $stageStart = $now
            }
            $stage = $newStage
            if (-not $live) { Write-Line "  > $($Stages[$stage].Name)..." }
        }
    }

    if (-not $frontendReady -and (Test-TcpOpen $FrontendPort)) {
        $frontendReady = $true
        $took = if ($firstPass) { '' } else { " in $(Format-Seconds ($now - $frontendStart).TotalSeconds)" }
        Write-Line "  $check Frontend (Vite) ready on port $FrontendPort$took" 'Green'
    }

    if ($backendReady -and $frontendReady) { exit 0 }

    $waitingFor = @()
    if (-not $backendReady) { $waitingFor += "backend: $($Stages[$stage].Name)" }
    if (-not $frontendReady) { $waitingFor += 'frontend: Vite still starting' }

    if ($Once) {
        Write-Line "  Not ready - $($waitingFor -join '; ')" 'Yellow'
        exit 2
    }
    if (($now - $scriptStart).TotalSeconds -ge $TimeoutSec) {
        Write-Line "  Not ready after ${TimeoutSec}s - $($waitingFor -join '; ')" 'Yellow'
        Write-Line '    The services are still running; check their windows, or run this script again.' 'Yellow'
        exit 2
    }

    if ($backendReady) {
        $text = '  {0} Frontend (Vite) starting... {1}' -f $spinner[$tick % 4], (Format-Seconds ($now - $frontendStart).TotalSeconds)
    } else {
        $text = '  {0} {1}... {2}' -f $spinner[$tick % 4], $Stages[$stage].Name, (Format-Seconds ($now - $stageStart).TotalSeconds)
        $text += '   [backend total {0}]' -f (Format-Seconds ($now - $backendStart).TotalSeconds)
        if ($FrontendPort -gt 0) { $text += if ($frontendReady) { '  [frontend ready]' } else { '  [frontend starting]' } }
    }
    Write-Live $text

    $tick++
    $firstPass = $false
    Start-Sleep -Milliseconds 400
}
