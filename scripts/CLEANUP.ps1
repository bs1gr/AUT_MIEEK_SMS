# Cleanup Script - Move Obsolete Files
# Organizes old/unused files into the Obsolete folder

# Change to project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Student Management System - Cleanup Utility" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Create Obsolete directory structure
$obsoleteRoot = ".\Obsolete"
$obsoleteFolders = @(
    "$obsoleteRoot\old_scripts",
    "$obsoleteRoot\old_tests",
    "$obsoleteRoot\old_routers",
    "$obsoleteRoot\old_docs",
    "$obsoleteRoot\old_configs",
    "$obsoleteRoot\misc"
)

Write-Host "[1/4] Creating Obsolete directory structure..." -ForegroundColor Yellow
foreach ($folder in $obsoleteFolders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "  OK Directories created" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] Moving obsolete files..." -ForegroundColor Yellow

$movedCount = 0

# Files to move - organized by category
$filesToMove = @{
    "old_scripts" = @(
        "CHECK_PSUTIL.bat",
        "INSTALL_PSUTIL.bat",
        "FIX_EXIT_BUTTON.bat",
        "cleanup_obsolete.ps1",
        "release.ps1",
        "?????.vbs"
    )
    "old_tests" = @(
        "backend\tests\phase3_error_handling_logging.py",
        "backend\tests\phase3_schemas_with_validation.py",
        "backend\tests\phase3_schemas_with_validation_v2.py",
        "backend\tests\phase3_test_error_scenarios.py"
    )
    "old_routers" = @(
        "backend\routers\adminops.py",
        "backend\routers\analytics.py",
        "backend\routers\attendance.py",
        "backend\routers\courses.py",
        "backend\routers\enrollments.py",
        "backend\routers\exports.py",
        "backend\routers\grades.py",
        "backend\routers\imports.py",
        "backend\routers\performance.py",
        "backend\routers\students.py",
        "backend\routers\highlights.py",
        "backend\admin_routes.py.old.py"
    )
    "old_docs" = @(
        "CLAUDE.md",
        "IMPROVEMENTS_PLAN.md",
        "SERVER_CONTROLS.md"
    )
    "misc" = @(
        "backend\test_port_detection.py",
        "package-lock.json"
    )
}

foreach ($category in $filesToMove.Keys) {
    $destFolder = Join-Path $obsoleteRoot $category
    
    foreach ($file in $filesToMove[$category]) {
        if (Test-Path $file) {
            $fileName = Split-Path $file -Leaf
            $destPath = Join-Path $destFolder $fileName
            
            try {
                Move-Item -Path $file -Destination $destPath -Force
                Write-Host "  - Moved: $file" -ForegroundColor Gray
                $movedCount++
            } catch {
                Write-Host "  X Failed to move: $file" -ForegroundColor Red
            }
        }
    }
}

Write-Host "  OK Moved $movedCount files" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Cleaning up empty directories..." -ForegroundColor Yellow

# Remove specific directories if empty or obsolete
$dirsToCheck = @(
    ".\sms",
    ".\templates",
    ".\public",
    ".\tools",
    ".\backend\services",
    ".\backend\utils"
)

$removedDirs = 0
foreach ($dir in $dirsToCheck) {
    if (Test-Path $dir) {
        $items = Get-ChildItem $dir -Recurse -ErrorAction SilentlyContinue
        if ($items.Count -eq 0 -or ($items | Where-Object { $_.Name -ne '.gitkeep' }).Count -eq 0) {
            try {
                # Move to obsolete instead of deleting
                $dirName = Split-Path $dir -Leaf
                $destPath = Join-Path "$obsoleteRoot\misc" $dirName
                Move-Item -Path $dir -Destination $destPath -Force -ErrorAction SilentlyContinue
                Write-Host "  - Moved empty directory: $dir" -ForegroundColor Gray
                $removedDirs++
            } catch {
                # Silent fail - directory might be in use
            }
        }
    }
}

Write-Host "  OK Cleaned $removedDirs directories" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Cleaning temporary files..." -ForegroundColor Yellow

# Remove PID files
$pidFiles = Get-ChildItem -Path "." -Filter "*.pid" -File
foreach ($pidFile in $pidFiles) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "  - Removed: $($pidFile.Name)" -ForegroundColor Gray
}

# Remove Python cache
$pycacheCount = 0
Get-ChildItem -Path "." -Filter "__pycache__" -Recurse -Directory | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $pycacheCount++
}

Write-Host "  OK Removed $($pidFiles.Count) PID files" -ForegroundColor Green
Write-Host "  OK Removed $pycacheCount __pycache__ directories" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Cleanup Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Files moved to Obsolete: $movedCount" -ForegroundColor Green
Write-Host "  Directories cleaned: $removedDirs" -ForegroundColor Green
Write-Host "  Temporary files removed: $($pidFiles.Count + $pycacheCount)" -ForegroundColor Green
Write-Host ""
Write-Host "  Location: .\Obsolete\" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Note: You can safely delete the Obsolete folder if you" -ForegroundColor Gray
Write-Host "        don't need these old files anymore." -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
