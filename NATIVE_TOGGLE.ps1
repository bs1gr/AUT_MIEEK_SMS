[CmdletBinding()]
param(
    [ValidateSet('toggle', 'start', 'stop', 'status')]
    [string]$Action = 'toggle',
    [switch]$Explain
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nativeScript = Join-Path $scriptDir 'NATIVE.ps1'
$backendProcessFile = Join-Path $scriptDir '.backend.pid'
$frontendProcessFile = Join-Path $scriptDir '.frontend.pid'
$backendVenvPath = Join-Path $scriptDir 'backend\.venv'
$frontendNodeModulesPath = Join-Path $scriptDir 'frontend\node_modules'
$desktopShortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'SMS Native Toggle.lnk'
$backendRootPath = Join-Path $scriptDir 'backend'
$frontendRootPath = Join-Path $scriptDir 'frontend'

function Get-ProcessCommandLine {
    param([int]$TargetProcessNumber)

    try {
        $processRecord = Get-CimInstance Win32_Process -Filter "ProcessId = $TargetProcessNumber" -ErrorAction SilentlyContinue
        if ($processRecord) {
            return [string]$processRecord.CommandLine
        }
    }
    catch {
        # Ignore lookup failures and return empty command line.
    }

    return ''
}

function Test-IsBackendProcess {
    param([int]$TargetProcessNumber)

    $process = Get-Process -Id $TargetProcessNumber -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    $commandLine = Get-ProcessCommandLine -TargetProcessNumber $TargetProcessNumber
    $exePath = [string]$process.Path

    return (
        $commandLine -match 'uvicorn' -or
        $commandLine -match 'backend\.main:app' -or
        $commandLine -match [regex]::Escape($backendRootPath) -or
        $exePath -match [regex]::Escape((Join-Path $backendVenvPath 'Scripts'))
    )
}

function Test-IsFrontendProcess {
    param([int]$TargetProcessNumber)

    $process = Get-Process -Id $TargetProcessNumber -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    $commandLine = Get-ProcessCommandLine -TargetProcessNumber $TargetProcessNumber
    $exePath = [string]$process.Path

    return (
        $commandLine -match 'vite' -or
        $commandLine -match 'npm(\.cmd)?\s+run\s+dev' -or
        $commandLine -match [regex]::Escape($frontendRootPath) -or
        $exePath -match 'node(\.exe)?$' -or
        $exePath -match 'pwsh(\.exe)?$'
    )
}

function Get-ListeningProcessIds {
    param([int]$Port)

    $listeningProcessIds = @()

    try {
        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listeners) {
            $listeningProcessIds += ($listeners | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess)
        }
    }
    catch {
        # Fall back to netstat below.
    }

    try {
        $lines = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
        foreach ($line in $lines) {
            $text = ($line.ToString() -replace '^\s+', '')
            $parts = $text -split '\s+'
            if ($parts.Length -lt 5) {
                continue
            }

            $portOwningProcess = 0
            if ([int]::TryParse($parts[-1], [ref]$portOwningProcess) -and $portOwningProcess -gt 0) {
                $listeningProcessIds += $portOwningProcess
            }
        }
    }
    catch {
        # Ignore fallback failures.
    }

    return @($listeningProcessIds | Sort-Object -Unique)
}

function Test-RunningFromPidFile {
    param(
        [string]$ProcessFile,
        [ValidateSet('backend', 'frontend')]
        [string]$Kind
    )

    if (-not (Test-Path $ProcessFile)) {
        return $false
    }

    try {
        $targetProcessNumber = [int](Get-Content $ProcessFile -Raw).Trim()
        $isExpectedProcess = if ($Kind -eq 'backend') {
            Test-IsBackendProcess -TargetProcessNumber $targetProcessNumber
        }
        else {
            Test-IsFrontendProcess -TargetProcessNumber $targetProcessNumber
        }

        if (-not $isExpectedProcess) {
            Remove-Item -Path $ProcessFile -Force -ErrorAction SilentlyContinue
        }

        return $isExpectedProcess
    }
    catch {
        return $false
    }
}

function Test-NativeListener {
    param(
        [int]$Port,
        [ValidateSet('backend', 'frontend')]
        [string]$Kind
    )

    foreach ($targetProcessNumber in (Get-ListeningProcessIds -Port $Port)) {
        $isExpectedProcess = if ($Kind -eq 'backend') {
            Test-IsBackendProcess -TargetProcessNumber $targetProcessNumber
        }
        else {
            Test-IsFrontendProcess -TargetProcessNumber $targetProcessNumber
        }

        if ($isExpectedProcess) {
            return $true
        }
    }

    return $false
}

function Get-NativeRunningReasons {
    $reasons = [System.Collections.Generic.List[string]]::new()

    if (Test-RunningFromPidFile -ProcessFile $backendProcessFile -Kind backend) {
        $reasons.Add('backend PID file points to a native backend process') | Out-Null
    }

    if (Test-RunningFromPidFile -ProcessFile $frontendProcessFile -Kind frontend) {
        $reasons.Add('frontend PID file points to a native frontend process') | Out-Null
    }

    if (Test-NativeListener -Port 8000 -Kind backend) {
        $reasons.Add('port 8000 is owned by a native backend process') | Out-Null
    }

    if (Test-NativeListener -Port 5173 -Kind frontend) {
        $reasons.Add('port 5173 is owned by a native frontend process') | Out-Null
    }

    return @($reasons | Select-Object -Unique)
}

function Write-DecisionTrace {
    param([string]$Message)

    if ($Explain) {
        Write-Host "Decision: $Message" -ForegroundColor DarkCyan
    }

    Write-Verbose "Decision=$Message"
}

function Test-NativeRunning {
    return @(Get-NativeRunningReasons).Count -gt 0
}

function Test-NativeEnvironmentReady {
    return (Test-Path $backendVenvPath) -and (Test-Path $frontendNodeModulesPath)
}

function Remove-NativeDesktopShortcut {
    if (-not (Test-Path $desktopShortcutPath)) {
        return
    }

    try {
        Remove-Item -Path $desktopShortcutPath -Force
        Write-Host "🧹 Removed stale shortcut: $desktopShortcutPath" -ForegroundColor Yellow
    }
    catch {
        Write-Host "⚠️  Failed to remove stale shortcut: $desktopShortcutPath" -ForegroundColor Yellow
    }
}

function Assert-NativeEnvironmentReady {
    if (Test-NativeEnvironmentReady) {
        return
    }

    Remove-NativeDesktopShortcut
    Write-Host '❌ SMS Native Toggle is only available for a prepared native environment.' -ForegroundColor Red
    Write-Host 'ℹ️  Required:' -ForegroundColor Cyan
    Write-Host "   • $backendVenvPath" -ForegroundColor Gray
    Write-Host "   • $frontendNodeModulesPath" -ForegroundColor Gray
    Write-Host 'ℹ️  The desktop shortcut was removed because native setup is missing.' -ForegroundColor Cyan
    Write-Host 'ℹ️  Run .\NATIVE.ps1 -Setup first, then recreate/use the shortcut.' -ForegroundColor Cyan
    exit 1
}

if (-not (Test-Path $nativeScript)) {
    Write-Host "❌ NATIVE.ps1 not found at: $nativeScript" -ForegroundColor Red
    exit 1
}

switch ($Action) {
    'status' {
        if (-not (Test-NativeEnvironmentReady) -and -not (Test-NativeRunning)) {
            Remove-NativeDesktopShortcut
            Write-Host 'ℹ️  Native setup is missing, so the desktop shortcut was removed.' -ForegroundColor Cyan
        }
        & $nativeScript -Status
        exit $LASTEXITCODE
    }
    'start' {
        Assert-NativeEnvironmentReady
        Write-DecisionTrace 'start because the caller explicitly requested -Action start.'
        Write-Host '▶ Starting native development mode...' -ForegroundColor Cyan
        & $nativeScript -Start
        exit $LASTEXITCODE
    }
    'stop' {
        Write-DecisionTrace 'stop because the caller explicitly requested -Action stop.'
        Write-Host '■ Stopping native development mode...' -ForegroundColor Yellow
        & $nativeScript -Stop
        exit $LASTEXITCODE
    }
    'toggle' {
        $runningReasons = @(Get-NativeRunningReasons)
        if ($runningReasons.Count -gt 0) {
            Write-DecisionTrace ('stop because ' + ($runningReasons -join '; '))
            Write-Host '■ Native mode detected as running. Stopping it now...' -ForegroundColor Yellow
            & $nativeScript -Stop
            exit $LASTEXITCODE
        }

        Assert-NativeEnvironmentReady
        Write-DecisionTrace 'start because no native backend or frontend process was detected.'
        Write-Host '▶ Native mode is not running. Starting it now...' -ForegroundColor Cyan
        & $nativeScript -Start
        exit $LASTEXITCODE
    }
}
