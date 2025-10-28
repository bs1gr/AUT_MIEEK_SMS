# Remove non-essential Markdown documentation, keeping only README files
# - Keeps: root README.md and frontend/README.md
# - Deletes: all other *.md files under the repository

param(
    [switch]$WhatIf
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Documentation cleanup starting in: $projectRoot" -ForegroundColor Cyan

$keepPaths = @(
    (Join-Path $projectRoot 'README.md').ToLower(),
    (Join-Path $projectRoot 'frontend' 'README.md').ToLower()
)

$mdFiles = Get-ChildItem -Path $projectRoot -Filter *.md -File -Recurse

$deleted = 0
$kept = 0
foreach ($f in $mdFiles) {
    $full = $f.FullName.ToLower()
    if ($keepPaths -contains $full) {
        $kept++
        continue
    }
    if ($WhatIf) {
        Write-Host "Would remove: $($f.FullName)" -ForegroundColor Yellow
    } else {
        try {
            Remove-Item -Path $f.FullName -Force
            Write-Host "Removed: $($f.FullName)" -ForegroundColor DarkGray
            $deleted++
        } catch {
            Write-Host "Failed to remove: $($f.FullName) -> $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "Cleanup complete. Kept: $kept, Removed: $deleted" -ForegroundColor Green
