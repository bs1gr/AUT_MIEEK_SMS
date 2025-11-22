<#
Safe cleanup script to remove local temporary artifacts and caches.
Run from repository root in PowerShell:

    pwsh.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\CLEANUP_TEMP.ps1

This script will remove:
- .mypy_cache
- .ruff_cache
- tmp_test_migrations/test_migrations.db
- pytest-full-output.txt (if still present)

It will NOT remove backups/ or data/ directories.
#>

Write-Host "Running safe cleanup..." -ForegroundColor Cyan

function Safe-Remove-Item([string]$path) {
    if (Test-Path $path) {
        try {
            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed: $path" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove: $path — $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Not found (skipping): $path" -ForegroundColor DarkGray
    }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

Push-Location $repoRoot

Safe-Remove-Item ".mypy_cache"
Safe-Remove-Item ".ruff_cache"
Safe-Remove-Item "tmp_test_migrations\test_migrations.db"
Safe-Remove-Item "pytest-full-output.txt"

Write-Host "Cleanup complete." -ForegroundColor Cyan

Pop-Location
