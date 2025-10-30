<#
DEPRECATED: scripts/legacy/RUN.ps1

This legacy launcher has been replaced.

Use the new intelligent startup instead:
    .\QUICKSTART.ps1           # Auto-detects, installs deps, starts app
or:
    .\SMART_SETUP.ps1 -SkipStart   # Setup only (no start)

For stopping and management:
    .\SMS.ps1
#>

Write-Host "This script is deprecated. Launching QUICKSTART.ps1..." -ForegroundColor Yellow
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$quick = Join-Path $root 'QUICKSTART.ps1'
if (Test-Path $quick) {
    & $quick @args
    exit $LASTEXITCODE
} else {
    Write-Host "QUICKSTART.ps1 not found at $quick" -ForegroundColor Red
    exit 1
}
