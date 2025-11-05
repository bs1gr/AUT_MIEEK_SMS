[CmdletBinding()]
param(
    [switch]$SkipStop,
    [switch]$SkipSetup,
    [switch]$SkipDependencyInstall,
    [switch]$ResetDatabase,
    [string]$LogDirectory = "logs\\test-runs",
    [string]$VenvName = ".venv_backend_tests",
    [string[]]$PytestArgs = @("-q"),
    [switch]$ForceReinstall,
    [string]$PythonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot ".")
$logDir = Join-Path $repoRoot $LogDirectory
if (-not (Test-Path $logDir)) {
    [void](New-Item -ItemType Directory -Path $logDir -Force)
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $logDir "backend_tests_$timestamp.log"

function Write-Log {
    param([string]$Message)
    $entry = "{0:u} {1}" -f (Get-Date), $Message
    Write-Host $entry
    Add-Content -Path $logFile -Value $entry
}

function Invoke-LoggedCommand {
    param(
        [string]$Description,
        [scriptblock]$Command
    )

    Write-Log "START: $Description"
    try {
        $result = & $Command 2>&1
        if ($null -ne $result) {
            $result | Tee-Object -FilePath $logFile -Append | Out-Host
        }
        Write-Log "DONE: $Description"
    }
    catch {
        Write-Log "FAIL: $Description => $($_.Exception.Message)"
        throw
    }
}

Write-Log "Log file initialized at $logFile"

if (-not $SkipStop) {
    $smsScript = Join-Path $repoRoot "SMS.ps1"
    if (Test-Path $smsScript) {
        Invoke-LoggedCommand -Description "Stopping running SMS stack" -Command {
            & $smsScript -Stop
        }
    }
    else {
        Write-Log "SMS.ps1 not found; skipping stop step."
    }
}
else {
    Write-Log "SkipStop flag supplied; not stopping running processes."
}

if (-not $SkipSetup) {
    $smartSetup = Join-Path $repoRoot "SMART_SETUP.ps1"
    if (Test-Path $smartSetup) {
        Invoke-LoggedCommand -Description "Running SMART_SETUP.ps1 -PreferNative -SkipStart" -Command {
            & $smartSetup -PreferNative -SkipStart
        }
    }
    else {
        Write-Log "SMART_SETUP.ps1 not found; skipping setup."
    }
}
else {
    Write-Log "SkipSetup flag supplied; skipping SMART_SETUP."
}

if ($ResetDatabase) {
    $dbPath = Join-Path $repoRoot "data\student_management.db"
    if (Test-Path $dbPath) {
        Invoke-LoggedCommand -Description "Removing local database at $dbPath" -Command {
            Remove-Item $dbPath -Force
        }
    }
    else {
        Write-Log "Database file not present; nothing to remove."
    }
}

if ($PythonPath) {
    if (-not (Test-Path $PythonPath)) {
        throw "Python executable not found at $PythonPath"
    }
    $pythonExecutable = (Resolve-Path $PythonPath).Path
}
else {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        throw "Unable to locate python. Provide -PythonPath to override."
    }
    $pythonExecutable = $pythonCmd.Source
}
Write-Log "Using Python executable: $pythonExecutable"

$venvPath = Join-Path $repoRoot $VenvName
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Invoke-LoggedCommand -Description "Creating virtual environment at $venvPath" -Command {
        & $pythonExecutable -m venv $venvPath
    }
}
else {
    Write-Log "Virtual environment already exists at $venvPath"
}

if (-not (Test-Path $venvPython)) {
    throw "Virtual environment creation failed; python not found at $venvPython"
}

if (-not $SkipDependencyInstall) {
    Invoke-LoggedCommand -Description "Upgrading pip/setuptools/wheel" -Command {
        & $venvPython -m pip install --upgrade pip setuptools wheel
    }

    $requirementsFiles = @()
    $runtimeRequirements = Join-Path $repoRoot "backend\requirements.txt"
    if (Test-Path $runtimeRequirements) {
        $requirementsFiles += $runtimeRequirements
    }

    $devRequirements = Join-Path $repoRoot "backend\requirements-dev.txt"
    if (Test-Path $devRequirements) {
        $requirementsFiles += $devRequirements
    }

    if ($requirementsFiles.Count -eq 0) {
        throw "Could not locate backend requirements files."
    }

    foreach ($req in $requirementsFiles) {
        $installArgs = @("-m", "pip", "install")
        if ($ForceReinstall) {
            $installArgs += "--force-reinstall"
        }
        $installArgs += "-r"
        $installArgs += $req

        Invoke-LoggedCommand -Description "Installing dependencies from $req" -Command {
            & $venvPython @installArgs
        }
    }
}
else {
    Write-Log "SkipDependencyInstall flag supplied; skipping pip install."
}

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
Write-Log ("Running pytest with arguments: {0}" -f ($PytestArgs -join ' '))

Push-Location (Join-Path $repoRoot "backend")
try {
    & $venvPython -m pytest @PytestArgs 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Host
    $pytestExit = $LASTEXITCODE
}
finally {
    Pop-Location
}
$stopwatch.Stop()
Write-Log ("Pytest completed in {0} seconds with exit code {1}" -f [Math]::Round($stopwatch.Elapsed.TotalSeconds, 2), $pytestExit)

if ($pytestExit -ne 0) {
    Write-Log "Pytest reported failures. See log for details."
    exit $pytestExit
}

Write-Log "Backend test suite completed successfully."
Write-Log "Detailed log saved to $logFile"
exit 0
