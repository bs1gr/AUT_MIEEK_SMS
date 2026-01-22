Write-Host "Performing final cleanup of root directory..." -ForegroundColor Cyan

$filesToRemove = @(
    "StudentRow.tsx",
    "SkeletonLoader.tsx",
    "saved-search.spec.ts"
)

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed $file" -ForegroundColor Green
    }
}

Write-Host "Cleanup complete." -ForegroundColor Green
