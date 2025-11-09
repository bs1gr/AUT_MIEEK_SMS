<#
DEPRECATED: scripts/SETUP.ps1

This script has been superseded by SMART_SETUP.ps1 which handles:
- First-time installation detection
- Prerequisite checking (Python/Node.js/Docker)
- Automatic dependency installation
- Database initialization
- Deployment mode selection
- Build and run orchestration

Please use:
    .\RUN.ps1                    # One-click install & start (Docker)
or:
    .\SMART_SETUP.ps1 -PreferDocker -SkipStart   # Setup only (Docker)

This wrapper will forward to SMART_SETUP for compatibility. For development/native workflows prefer `scripts/dev/run-native.ps1`.
#>

param(
    [switch]$SkipBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "\nThis script is deprecated." -ForegroundColor Yellow
    Write-Host "Use .\\RUN.ps1 or .\\SMART_SETUP.ps1 instead." -ForegroundColor Yellow
    exit 0
}

$forwardArgs = @('-PreferDocker')
if ($SkipBuild) { $forwardArgs += '-SkipStart' } else { $forwardArgs += '-SkipStart' }

$smart = Join-Path (Split-Path $PSScriptRoot -Parent) 'SMART_SETUP.ps1'
if (-not (Test-Path $smart)) {
    Write-Host "SMART_SETUP.ps1 not found at $smart" -ForegroundColor Red
    Write-Host "Please run .\\RUN.ps1" -ForegroundColor Yellow
    exit 1
}

& $smart @forwardArgs
exit $LASTEXITCODE
