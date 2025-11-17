<#
DEPRECATED: scripts/SETUP.ps1

⚠️ This script is deprecated and will be removed in a future version.

Use these instead:
    .\RUN.ps1                           # Production (Docker) - ONE-CLICK RECOMMENDED
    .\scripts\dev\run-native.ps1        # Development (Native mode with hot reload)
    .\SMART_SETUP.ps1                   # Advanced setup with options
    .\SMS.ps1                           # Management operations

This wrapper forwards to SMART_SETUP.ps1 for backward compatibility only.

DEPRECATED SCRIPTS ARCHIVED (Nov 17, 2025):
- scripts/FAST_SETUP_DEV.ps1 → Use scripts/dev/run-native.ps1
- scripts/SETUP_PRECOMMIT.ps1 → Manual: pip install pre-commit && pre-commit install
- scripts/deploy/SMART_SETUP.ps1 → Use root SMART_SETUP.ps1 or RUN.ps1
- scripts/internal/INSTALLER.ps1 → Use RUN.ps1
- scripts/deploy/internal/INSTALLER.ps1 → Use RUN.ps1

See: archive/deprecated/setup_scripts/README.md for migration guide
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
