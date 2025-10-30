<#
DEPRECATED: scripts/legacy/INSTALL.ps1

Use the new intelligent setup instead:
    .\QUICKSTART.ps1            # Full auto install & start
or:
    .\SMART_SETUP.ps1           # Advanced options

This script is no longer maintained and may produce incorrect results.
#>

$root = Split-Path -Parent $PSScriptRoot
$qs = Join-Path $root 'QUICKSTART.ps1'
if (Test-Path $qs) {
    Write-Host "This script is deprecated. Launching QUICKSTART.ps1..." -ForegroundColor Yellow
    & $qs @args
    exit $LASTEXITCODE
}
else {
    Write-Host "QUICKSTART.ps1 not found at $qs" -ForegroundColor Red
    exit 1
}
