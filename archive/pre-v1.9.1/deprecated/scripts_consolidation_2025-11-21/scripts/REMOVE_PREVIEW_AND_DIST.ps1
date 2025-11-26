<#
Removes `rewrite-preview-local` and `dist` directories from the repository
and stages removals in git if they are tracked. This script is destructive for
these two directories only. Run from the repository root.

Usage:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\REMOVE_PREVIEW_AND_DIST.ps1

It will:
 - Prompt for confirmation
 - Remove directories (if present)
 - Run `git rm -r --ignore-unmatch` to untrack them if needed
#>

param(
    [switch]$Force
)

function Confirm-Action($msg) {
    if ($Force) { return $true }
    $choice = Read-Host "$msg [y/N]"
    return $choice -match '^[yY](es)?$'
}

if (-not (Confirm-Action "Delete 'rewrite-preview-local' and 'dist' directories from the working tree?")) {
    Write-Host "Aborted by user" -ForegroundColor Yellow
    exit 0
}

function Safe-Remove($path) {
    if (Test-Path $path) {
        try {
            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed: $path" -ForegroundColor Green
            # Untrack in git if applicable
            if (Get-Command git -ErrorAction SilentlyContinue) {
                git rm -r --ignore-unmatch $path | Out-Null
                Write-Host "Attempted to untrack in git: $path" -ForegroundColor Cyan
            }
        } catch {
            Write-Host ([string]::Format("Failed to remove {0}: {1}", $path, $_)) -ForegroundColor Red
        }
    } else {
        Write-Host "Not found (skipping): $path" -ForegroundColor DarkGray
    }
}

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Definition)

Safe-Remove "rewrite-preview-local"
Safe-Remove "dist"

Write-Host "Removal complete. Please review 'git status' to confirm staged changes." -ForegroundColor Cyan

Pop-Location
