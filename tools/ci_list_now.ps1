# DEPRECATED: use scripts/utils/ci/ci_list_now.ps1

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    $ForwardArgs
)

$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root 'scripts\utils\ci\ci_list_now.ps1'
Write-Host "[DEPRECATED] Redirecting to $target" -ForegroundColor Yellow

if (-not (Test-Path $target)) {
    Write-Error "Target script not found: $target"
    exit 1
}

& $target @ForwardArgs
