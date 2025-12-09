# DEPRECATED: use scripts/utils/installer/SMS_UNINSTALLER_WIZARD.ps1
# This stub forwards all parameters to the consolidated location.
# Version = "1.10.1"  # keep in sync with VERSION for legacy tests

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    $ForwardArgs
)

$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root 'scripts\utils\installer\SMS_UNINSTALLER_WIZARD.ps1'
Write-Host "[DEPRECATED] Redirecting to $target" -ForegroundColor Yellow

if (-not (Test-Path $target)) {
    Write-Error "Target script not found: $target"
    exit 1
}

& $target @ForwardArgs
