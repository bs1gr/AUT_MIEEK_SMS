# ============================================================================
#   Student Management System - Cleanup Obsolete Files Script
# ============================================================================

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Student Management System - Cleanup Obsolete Files" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Files to keep (essential documentation)
$keepFiles = @(
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "TODO.md",
    "VERSION",
    "backend\README.md",
    "frontend\README.md",
    "backend\migrations\README"
)

# Obsolete markdown files to remove
$obsoleteMarkdownFiles = @(
    "VERSIONING_GUIDE.md",
    "TEACHING_SCHEDULE_GUIDE.md",
    "RUST_BUILDTOOLS_UPDATE.md",
    "QUICK_REFERENCE.md",
    "PACKAGE_VERSION_FIX.md",
    "ORGANIZATION_SUMMARY.md",
    "NODE_VERSION_UPDATE.md",
    "INSTALL_GUIDE.md",
    "IMPLEMENTATION_REPORT.md",
    "HELP_DOCUMENTATION_COMPLETE.md",
    "FRONTEND_TROUBLESHOOTING.md",
    "DEPLOYMENT_QUICK_START.md",
    "DEPENDENCY_UPDATE_LOG.md",
    "DAILY_PERFORMANCE_GUIDE.md",
    "COMPLETE_UPDATE_SUMMARY.md",
    "CODE_IMPROVEMENTS.md"
)

Write-Host "Files that will be kept:" -ForegroundColor Green
foreach ($file in $keepFiles) {
    if (Test-Path $file) {
        Write-Host "  √ $file" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "Obsolete files that will be removed:" -ForegroundColor Yellow
$filesToRemove = @()
foreach ($file in $obsoleteMarkdownFiles) {
    if (Test-Path $file) {
        Write-Host "  X $file" -ForegroundColor Red
        $filesToRemove += $file
    }
}

if ($filesToRemove.Count -eq 0) {
    Write-Host "  No obsolete files found." -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Found $($filesToRemove.Count) obsolete file(s) to remove." -ForegroundColor Yellow
$confirm = Read-Host "Do you want to proceed with deletion? (Y/N)"

if ($confirm -notmatch '^(Y|y)$') {
    Write-Host ""
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Removing obsolete files..." -ForegroundColor Yellow
$removedCount = 0

foreach ($file in $filesToRemove) {
    try {
        Remove-Item $file -Force
        Write-Host "  √ Removed: $file" -ForegroundColor Green
        $removedCount++
    } catch {
        Write-Host "  X Failed to remove: $file" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Removed $removedCount file(s)." -ForegroundColor White
Write-Host "Essential documentation preserved:" -ForegroundColor White
Write-Host "  - README.md (main documentation)" -ForegroundColor Gray
Write-Host "  - CHANGELOG.md (version history)" -ForegroundColor Gray
Write-Host "  - TODO.md (development tasks)" -ForegroundColor Gray
Write-Host "  - LICENSE (project license)" -ForegroundColor Gray
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
