# DEPRECATED: use scripts/utils/ci/monitor_ci_issues.ps1

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    $ForwardArgs
)

$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root 'scripts\utils\ci\monitor_ci_issues.ps1'
Write-Host "[DEPRECATED] Redirecting to $target" -ForegroundColor Yellow

if (-not (Test-Path $target)) {
    Write-Error "Target script not found: $target"
    exit 1
}

& $target @ForwardArgs
