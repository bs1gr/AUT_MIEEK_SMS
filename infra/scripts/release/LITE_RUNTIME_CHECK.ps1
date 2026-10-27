#Requires -Version 5.1
<#
.SYNOPSIS
    Starts the frozen SMS_Lite build in a throwaway profile and runs the API/PDF/SPA check.

.DESCRIPTION
    Plan todo 31. The installer pipeline used to only build SMS_Lite; packaging mistakes that
    survive a build (missing fonts, a stale or wrong-mode frontend dist, a missing hidden
    import) only showed up on a user's PC. This script launches the exe the way a user would,
    but isolated:
      * USERPROFILE / LOCALAPPDATA / APPDATA point at a temporary folder, so it creates a fresh
        SQLite database there and never sees QNAP credentials or a real install;
      * BROWSER is a no-op command, so no browser window opens;
      * DEFAULT_ADMIN_* seed a known admin account.
    It waits for /health, runs lite_runtime_check.py (login, Greek student + course, both PDF
    exports with DejaVu embedded and Greek text extractable, Excel export, SPA index + assets),
    then stops the process tree it started.

    SMS_Lite listens on port 8000 and, by design, shuts down whatever already holds that port.
    This script therefore refuses to start when 8000 is in use.

.PARAMETER LiteExe
    Path to SMS_Lite.exe. Defaults to infra\installer\windows\dist\SMS_Lite\SMS_Lite.exe.

.PARAMETER Python
    Python interpreter with httpx (and pypdf, installed on demand). Defaults to the repo venv,
    then whatever `python` resolves to.

.PARAMETER TimeoutSeconds
    How long to wait for /health (default 240; a cold start on a slow runner takes ~60 s).
#>

[CmdletBinding()]
param(
    [string]$LiteExe,
    [string]$Python,
    [int]$TimeoutSeconds = 240
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..\..")).Path
if (-not $LiteExe) { $LiteExe = Join-Path $ProjectRoot "infra\installer\windows\dist\SMS_Lite\SMS_Lite.exe" }
if (-not $Python) {
    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    $Python = if (Test-Path $venvPython) { $venvPython } else { 'python' }
}
$checkScript = Join-Path $PSScriptRoot "lite_runtime_check.py"
$baseUrl = 'http://127.0.0.1:8000'
$adminEmail = 'lite-check@example.com'
$adminPassword = 'LiteCheck#2026!x'

function Write-Step([string]$msg) { Write-Host "[lite-check] $msg" }

if (-not (Test-Path $LiteExe)) { Write-Error "SMS_Lite.exe not found: $LiteExe"; exit 1 }
if (-not (Test-Path $checkScript)) { Write-Error "Check script not found: $checkScript"; exit 1 }

$busy = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    $owner = ($busy | Select-Object -First 1).OwningProcess
    Write-Error "Port 8000 is in use by PID $owner. SMS_Lite would shut it down; stop it first (or skip the runtime check)."
    exit 1
}

# pypdf is a dev-only dependency; CI installs requirements.txt only.
& $Python -c "import httpx, pypdf" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Step "Installing pypdf for the PDF checks..."
    & $Python -m pip install -q pypdf
    if ($LASTEXITCODE -ne 0) { Write-Error "Could not install pypdf"; exit 1 }
}

$profileRoot = Join-Path ([IO.Path]::GetTempPath()) ("sms-lite-check-" + [IO.Path]::GetRandomFileName().Replace('.', ''))
foreach ($d in 'AppData\Local', 'AppData\Roaming') { New-Item -ItemType Directory -Force (Join-Path $profileRoot $d) | Out-Null }
$noop = Join-Path $profileRoot 'noop.cmd'
Set-Content -Path $noop -Value '@exit /b 0' -Encoding ascii

# The exe inherits these; they are restored below so the caller's session is untouched.
$overrides = @{
    USERPROFILE = $profileRoot
    HOME = $profileRoot
    LOCALAPPDATA = Join-Path $profileRoot 'AppData\Local'
    APPDATA = Join-Path $profileRoot 'AppData\Roaming'
    BROWSER = "$noop %s"
    SMTP_OVERRIDE_PATH = Join-Path $profileRoot 'smtp_override.json'
    DEFAULT_ADMIN_EMAIL = $adminEmail
    DEFAULT_ADMIN_PASSWORD = $adminPassword
    DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED = 'false'
}
$saved = @{}
foreach ($k in $overrides.Keys) { $saved[$k] = [Environment]::GetEnvironmentVariable($k, 'Process'); [Environment]::SetEnvironmentVariable($k, $overrides[$k], 'Process') }
$outLog = Join-Path $profileRoot 'lite-stdout.log'
$errLog = Join-Path $profileRoot 'lite-stderr.log'

Write-Step "Starting $LiteExe (profile $profileRoot)"
$start = Get-Date
try {
    $proc = Start-Process -FilePath $LiteExe -WorkingDirectory (Split-Path $LiteExe) -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden
} finally {
    foreach ($k in $saved.Keys) { [Environment]::SetEnvironmentVariable($k, $saved[$k], 'Process') }
}
$exitCode = 1
function Show-LiteLogs {
    foreach ($f in $errLog, (Join-Path $profileRoot 'AppData\Local\SMS_Native_Lite_Simple\debug.log')) {
        if (Test-Path $f) { Write-Host "--- $(Split-Path $f -Leaf) (tail) ---"; Get-Content $f -Tail 30 }
    }
}
try {
    $healthy = $false
    while (((Get-Date) - $start).TotalSeconds -lt $TimeoutSeconds) {
        if ($proc.HasExited) { break }
        try {
            if ((Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $healthy = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    $elapsed = [int]((Get-Date) - $start).TotalSeconds
    if (-not $healthy) {
        $why = if ($proc.HasExited) { "process exited with code $($proc.ExitCode)" } else { "no /health after $elapsed s" }
        Show-LiteLogs
        Write-Error "SMS_Lite did not become healthy: $why"
        exit 1
    }
    Write-Step "Healthy after $elapsed s; running API/PDF/SPA checks"
    & $Python -I $checkScript $baseUrl $adminEmail $adminPassword
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { Show-LiteLogs }
} finally {
    # Stop only the tree we started: the exe is a launcher whose child owns the listener.
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($proc.Id)" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessId
    foreach ($id in @($children) + @($proc.Id)) { if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } }
    Start-Sleep -Seconds 2
    try { [IO.Directory]::Delete($profileRoot, $true) } catch { Write-Step "profile left behind: $profileRoot" }
}

if ($exitCode -eq 0) { Write-Step "Lite runtime check passed" } else { Write-Error "Lite runtime check failed (exit $exitCode)" }
exit $exitCode
