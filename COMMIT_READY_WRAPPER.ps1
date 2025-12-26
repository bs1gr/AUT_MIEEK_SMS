param(
    [string]$Mode = 'quick',
    [switch]$NonInteractive,
    [switch]$SkipStartBackend,
    [Parameter(ValueFromRemainingArguments=$true)]
    [object[]]$RemainingArgs
)

# Wrapper: start backend if needed, run COMMIT_READY.ps1 with same args, stop backend if started
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$healthUrl = 'http://127.0.0.1:8000/health'
$backendStarted = $false

function Test-Health {
    param([string]$Url)
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Start-Backend {
    try {
        $psExe = (Get-Command powershell -ErrorAction SilentlyContinue).Source
        if (-not $psExe) { $psExe = 'powershell' }
        Start-Process -FilePath $psExe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$SCRIPT_DIR\NATIVE.ps1`" -Backend -Start" -WindowStyle Hidden | Out-Null
        # wait up to 30s
        for ($i=0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            if (Test-Health -Url $healthUrl) { return $true }
        }
        return $true # started but not healthy in time
    }
    catch {
        Write-Host "[WARN] Failed to start backend: $_" -ForegroundColor Yellow
        return $false
    }
}

function Stop-Backend {
    try {
        $psExe = (Get-Command powershell -ErrorAction SilentlyContinue).Source
        if (-not $psExe) { $psExe = 'powershell' }
        Start-Process -FilePath $psExe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$SCRIPT_DIR\NATIVE.ps1`" -Stop -Backend" -NoNewWindow -Wait | Out-Null
        return $true
    }
    catch {
        Write-Host "[WARN] Failed to stop backend: $_" -ForegroundColor Yellow
        return $false
    }
}

# Start backend if needed (unless user requested SkipStartBackend)
if (-not $SkipStartBackend) {
    if (-not (Test-Health -Url $healthUrl)) {
        Write-Host "[INFO] Backend not healthy; starting background backend..." -ForegroundColor Cyan
        $backendStarted = Start-Backend
        if ($backendStarted) { Write-Host "[INFO] Background backend started (or attempted)" -ForegroundColor Cyan }
    } else {
        Write-Host "[INFO] Backend already healthy; not starting." -ForegroundColor Cyan
    }
} else {
    Write-Host "[INFO] SkipStartBackend set; not starting backend." -ForegroundColor Cyan
}

# Build argument list for COMMIT_READY.ps1
$argList = @()
if ($Mode) { $argList += "-Mode"; $argList += $Mode }
if ($NonInteractive) { $argList += "-NonInteractive" }
# append any remaining args
if ($RemainingArgs) { $argList += $RemainingArgs }

# Run COMMIT_READY.ps1 in a child PowerShell so wrapper doesn't interfere
$psExe = (Get-Command powershell -ErrorAction SilentlyContinue).Source
if (-not $psExe) { $psExe = 'powershell' }
$commitReadyPath = Join-Path $SCRIPT_DIR 'COMMIT_READY.ps1'
$quotedArgs = $argList | ForEach-Object { if ($_ -is [string]) { '"' + ($_ -replace '"','\"') + '"' } else { $_ } }
$argString = $quotedArgs -join ' '

Write-Host "[INFO] Running COMMIT_READY.ps1 $argString" -ForegroundColor Cyan
$proc = Start-Process -FilePath $psExe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$commitReadyPath`" $argString" -NoNewWindow -Wait -PassThru
$exitCode = $proc.ExitCode

# Stop backend if we started it
if ($backendStarted) {
    Write-Host "[INFO] Stopping background backend started for this run..." -ForegroundColor Cyan
    Stop-Backend | Out-Null
}

exit $exitCode
