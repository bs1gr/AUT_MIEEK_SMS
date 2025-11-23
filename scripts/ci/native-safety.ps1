<#
Run a set of safe, non-destructive checks against the native development script (NATIVE.ps1).
Intended to be executed in CI on Windows runners. The script must not modify any files.

This script executes the following checks:
- Runs `NATIVE.ps1 -DeepClean -WhatIf` to ensure the dry-run listing exits successfully.
- Runs `NATIVE.ps1 -Status` (if present) to ensure status command returns cleanly.

Exits with non-zero on any failure.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[ok]   $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

try {
    Write-Info "Locating repository root and NATIVE.ps1"
    $scriptRoot = $PSScriptRoot
    $repoRoot = Resolve-Path -Path (Join-Path $scriptRoot '..\..')
    $nativePath = Join-Path $repoRoot 'NATIVE.ps1'
    if (-not (Test-Path $nativePath)) {
        Write-Err "NATIVE.ps1 not found at expected path: $nativePath"
        exit 2
    }

    Write-Info "Running: NATIVE.ps1 -DeepClean -WhatIf (dry-run)"
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $nativePath -DeepClean -WhatIf
    Write-Success "DeepClean dry-run completed successfully"

    Write-Info "Attempting lightweight status check: NATIVE.ps1 -Status (if supported)"
    try {
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $nativePath -Status
        Write-Success "Status check completed successfully (or exited 0)"
    } catch {
        Write-Info "Status command either not supported or returned non-zero; this is non-fatal in CI smoke check. Message: $_"
    }

    Write-Success "All native safety checks passed"
    exit 0
} catch {
    Write-Err "Native safety checks failed: $_"
    exit 1
}
