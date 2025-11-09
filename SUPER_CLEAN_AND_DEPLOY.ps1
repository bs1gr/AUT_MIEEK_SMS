# SUPER_CLEAN_AND_DEPLOY.ps1
# Full workspace cleanup: Docker, caches, logs, node_modules, .venv, temp files, old backups

Write-Host "===============================" -ForegroundColor Cyan
Write-Host "  SUPER CLEAN & DEPLOY SCRIPT" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$cleaned = @()
$errors = @()
$totalSize = 0

function Remove-SafeItem {
    param(
        [string]$Path,
        [string]$Description
    )
    if (Test-Path $Path) {
        try {
            $size = (Get-ChildItem $Path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            if ($null -eq $size) { $size = 0 }
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            $sizeMB = [math]::Round($size / 1MB, 2)
            $script:totalSize += $size
            $script:cleaned += "$Description ($sizeMB MB)"
            Write-Host "✓ Removed: $Description" -ForegroundColor Green
        } catch {
            $script:errors += "$Description - $($_.Exception.Message)"
            Write-Host "✗ Failed: $Description - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "○ Not found: $Description" -ForegroundColor Gray
    }
}

Write-Host "Stopping all Docker containers..." -ForegroundColor Yellow
try {
    docker ps -q | ForEach-Object { docker stop $_ }
    docker system prune -af --volumes
    Write-Host "✓ Docker containers stopped and system pruned" -ForegroundColor Green
} catch {
    Write-Host "○ Docker not available or already stopped" -ForegroundColor Gray
}

# Remove Python caches
Write-Host "Removing __pycache__ and .pytest_cache..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | ForEach-Object { Remove-SafeItem $_.FullName "Python cache: $($_.FullName.Replace($PWD, '.'))" }
Remove-SafeItem ".pytest_cache" ".pytest_cache (root)"
Remove-SafeItem "backend\.pytest_cache" "backend/.pytest_cache"

# Remove virtual environments
Write-Host "Removing .venv directories..." -ForegroundColor Cyan
Remove-SafeItem ".venv" ".venv (root)"
Remove-SafeItem "backend\.venv" "backend/.venv"
Remove-SafeItem "frontend\.venv" "frontend/.venv"

# Remove node_modules and frontend build caches
Write-Host "Removing node_modules and frontend caches..." -ForegroundColor Cyan
Remove-SafeItem "frontend\node_modules" "frontend/node_modules"
Remove-SafeItem "frontend\node_modules\.cache" "frontend/node_modules/.cache"
Remove-SafeItem "frontend\.vite" "frontend/.vite"
Remove-SafeItem "backend\node_modules" "backend/node_modules"
Remove-SafeItem "backend\node_modules\.cache" "backend/node_modules/.cache"

# Remove logs and temp files
Write-Host "Removing logs and temp files..." -ForegroundColor Cyan
Remove-SafeItem "logs" "logs directory"
Remove-SafeItem "backend\logs" "backend/logs directory"
Remove-SafeItem "tmp_test_migrations" "tmp_test_migrations directory"

# Remove old backups (keep 2 most recent)
Write-Host "Cleaning old backup directories..." -ForegroundColor Cyan
if (Test-Path "backups") {
    $backups = Get-ChildItem "backups" -Directory | Sort-Object Name -Descending
    if ($backups.Count -gt 2) {
        $toRemove = $backups | Select-Object -Skip 2
        foreach ($backup in $toRemove) {
            Remove-SafeItem $backup.FullName "Old backup: $($backup.Name)"
        }
        Write-Host "✓ Kept 2 most recent backups, removed $($toRemove.Count) old backups" -ForegroundColor Green
    } else {
        Write-Host "○ Only $($backups.Count) backups found - keeping all" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""
if ($cleaned.Count -gt 0) {
    Write-Host "Successfully cleaned ($($cleaned.Count) items):" -ForegroundColor Green
    foreach ($item in $cleaned) {
        Write-Host "  ✓ $item" -ForegroundColor Green
    }
    Write-Host ""
    $totalMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "Total space freed: $totalMB MB" -ForegroundColor Cyan
} else {
    Write-Host "No items were removed." -ForegroundColor Yellow
}
if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors encountered ($($errors.Count) items):" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  ✗ $err" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "SUPER CLEAN completed!" -ForegroundColor Green
Write-Host ""
