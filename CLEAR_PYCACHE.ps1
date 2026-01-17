<#
.SYNOPSIS
    Clear Python cache files to fix import errors

.DESCRIPTION
    Removes all __pycache__ directories and .pyc files from the backend directory.
    This fixes "ModuleNotFoundError: No module named 'backend.database'" errors.

.EXAMPLE
    .\CLEAR_PYCACHE.ps1
#>

$ErrorActionPreference = 'Stop'

$backendDir = Join-Path $PSScriptRoot "backend"

Write-Host "Clearing Python cache..." -ForegroundColor Cyan

# Remove __pycache__ directories
$pycacheDirs = Get-ChildItem -Path $backendDir -Recurse -Directory -Filter "__pycache__" -Force
foreach ($dir in $pycacheDirs) {
    Write-Host "  Removing: $($dir.FullName)" -ForegroundColor Yellow
    Remove-Item -Path $dir.FullName -Recurse -Force
}

# Remove .pyc files
$pycFiles = Get-ChildItem -Path $backendDir -Recurse -Filter "*.pyc" -Force
foreach ($file in $pycFiles) {
    Write-Host "  Removing: $($file.FullName)" -ForegroundColor Yellow
    Remove-Item -Path $file.FullName -Force
}

# Remove .pyo files
$pyoFiles = Get-ChildItem -Path $backendDir -Recurse -Filter "*.pyo" -Force
foreach ($file in $pyoFiles) {
    Write-Host "  Removing: $($file.FullName)" -ForegroundColor Yellow
    Remove-Item -Path $file.FullName -Force
}

Write-Host "`n✓ Python cache cleared successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run: .\RUN_TESTS_BATCH.ps1" -ForegroundColor White
Write-Host "  2. Tests should now pass without 'backend.database' errors" -ForegroundColor White
