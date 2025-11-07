# CLEANUP_COMPREHENSIVE.ps1
# Comprehensive cleanup script for removing obsolete files across the project

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Comprehensive Project Cleanup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$cleaned = @()
$errors = @()
$totalSize = 0

# Function to safely remove item
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

Write-Host "Starting cleanup..." -ForegroundColor Yellow
Write-Host ""

# --- Subroutine: Remove non-essential Markdown documentation, keeping only README files ---
function Invoke-CleanupDocs {
    Write-Host "[DOCS] Cleaning up non-essential Markdown documentation..." -ForegroundColor Cyan
    $projectRoot = Split-Path -Parent $PSScriptRoot
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
        try {
            Remove-Item -Path $f.FullName -Force
            Write-Host "Removed: $($f.FullName)" -ForegroundColor DarkGray
            $deleted++
        } catch {
            Write-Host "Failed to remove: $($f.FullName) -> $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host "Doc cleanup complete. Kept: $kept, Removed: $deleted" -ForegroundColor Green
}

# --- Subroutine: Remove obsolete markdown files (from CLEANUP_OBSOLETE_FILES.ps1) ---
function Invoke-CleanupObsoleteFiles {
    Write-Host "[OBSOLETE] Removing obsolete markdown files..." -ForegroundColor Cyan
    # (keepFiles and projectRoot not used in this function)
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
    $filesToRemove = @()
    foreach ($file in $obsoleteMarkdownFiles) {
        if (Test-Path $file) {
            try {
                Remove-Item $file -Force
                Write-Host "  √ Removed: $file" -ForegroundColor Green
                $filesToRemove += $file
            } catch {
                Write-Host "  X Failed to remove: $file" -ForegroundColor Red
                Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
            }
        }
    }
    if ($filesToRemove.Count -eq 0) {
        Write-Host "  No obsolete files found." -ForegroundColor Green
    } else {
        Write-Host "Removed $($filesToRemove.Count) obsolete file(s)." -ForegroundColor White
    }
}

# Optionally run doc and obsolete file cleanup as part of comprehensive cleanup
param(
    [switch]$Docs,
    [switch]$Obsolete
)

if ($Docs) { Invoke-CleanupDocs }
if ($Obsolete) { Invoke-CleanupObsoleteFiles }

# 1. Remove obsolete LanguageToggle component (replaced by LanguageSwitcher)
Write-Host "[1/14] Removing obsolete LanguageToggle component..." -ForegroundColor Cyan
Remove-SafeItem "frontend\src\components\common\LanguageToggle.tsx" "Old LanguageToggle component"

# 2. Remove entire Obsolete folder
Write-Host "`n[2/14] Removing Obsolete folder..." -ForegroundColor Cyan
Remove-SafeItem "Obsolete" "Obsolete folder (old configs, docs, routers, scripts, tests)"

# 3. Remove old HTML control panels (replaced by React ControlPanel component)
Write-Host "`n[3/14] Removing old HTML control panels..." -ForegroundColor Cyan
Remove-SafeItem "CONTROL_PANEL.html" "Old HTML control panel"
Remove-SafeItem "html_control_panel.html" "Old HTML control panel (alternative)"

# 4. Remove old SMS subfolder (appears to be duplicate structure)
Write-Host "`n[4/14] Checking sms/ subfolder..." -ForegroundColor Cyan
if (Test-Path "sms\LICENSE") {
    Remove-SafeItem "sms" "Old sms/ subfolder (duplicate structure)"
}

# 5. Remove backup files
Write-Host "`n[5/14] Removing backup files..." -ForegroundColor Cyan
Remove-SafeItem "scripts\INSTALL.ps1.backup" "INSTALL.ps1 backup file"

# 6. Remove duplicate pytest.ini if exists in root (keep backend/pytest.ini)
Write-Host "`n[6/14] Checking for duplicate pytest.ini..." -ForegroundColor Cyan
if ((Test-Path "pytest.ini") -and (Test-Path "backend\pytest.ini")) {
    $rootContent = Get-Content "pytest.ini" -Raw
    $backendContent = Get-Content "backend\pytest.ini" -Raw
    if ($rootContent -eq $backendContent) {
        Remove-SafeItem "pytest.ini" "Duplicate pytest.ini (keeping backend version)"
    } else {
        Write-Host "○ pytest.ini files differ - keeping both" -ForegroundColor Yellow
    }
}

# 7. Remove old backup directories (keeping most recent 2)
Write-Host "`n[7/14] Cleaning old backup directories..." -ForegroundColor Cyan
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

# 8. Remove __pycache__ directories
Write-Host "`n[8/14] Removing Python cache directories..." -ForegroundColor Cyan
$pycacheDirs = Get-ChildItem -Path "backend" -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue
foreach ($dir in $pycacheDirs) {
    Remove-SafeItem $dir.FullName "Python cache: $($dir.FullName.Replace($PWD, '.'))"
}

# 9. Remove .pytest_cache
Write-Host "`n[9/14] Removing pytest cache..." -ForegroundColor Cyan
Remove-SafeItem ".pytest_cache" "Pytest cache directory"
Remove-SafeItem "backend\.pytest_cache" "Backend pytest cache"

# 10. Remove node_modules/.cache if exists
Write-Host "`n[10/14] Checking for build caches..." -ForegroundColor Cyan
Remove-SafeItem "frontend\node_modules\.cache" "Vite cache"
Remove-SafeItem "frontend\.vite" "Vite temp directory"

# 11. Docker: Remove QNAP-specific docker-compose (unless on QNAP)
Write-Host "`n[11/14] Checking Docker configuration files..." -ForegroundColor Cyan
if (Test-Path "docker-compose.qnap.yml") {
    Write-Host "○ Found docker-compose.qnap.yml" -ForegroundColor Yellow
    Write-Host "  This file is for QNAP Container Station deployment." -ForegroundColor Gray
    $removeQnap = Read-Host "Remove docker-compose.qnap.yml? (y/N)"
    if ($removeQnap -eq 'y' -or $removeQnap -eq 'Y') {
        Remove-SafeItem "docker-compose.qnap.yml" "QNAP-specific docker-compose configuration"
    } else {
        Write-Host "  Kept docker-compose.qnap.yml" -ForegroundColor Gray
    }
}

# 12. Docker: Clean dangling images and build cache
Write-Host "`n[12/14] Docker image and cache cleanup..." -ForegroundColor Cyan
try {
    $null = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "○ Docker is available" -ForegroundColor Gray

        # Check for dangling images
        $danglingImages = docker images -f "dangling=true" -q 2>$null
        if ($danglingImages) {
            Write-Host "  Found dangling Docker images" -ForegroundColor Yellow
            Write-Host "  Run 'docker image prune' to remove them manually" -ForegroundColor Gray
        }

        # Check build cache
        $buildCacheSize = docker system df --format '{{.Size}}' 2>$null | Select-Object -Skip 2 -First 1
        if ($buildCacheSize) {
            Write-Host "  Docker build cache: $buildCacheSize" -ForegroundColor Gray
            Write-Host "  Run 'docker builder prune' to clean build cache (optional)" -ForegroundColor Gray
        }

        # Check for stopped containers
        $stoppedContainers = docker ps -a -f "status=exited" -q 2>$null
        if ($stoppedContainers) {
            Write-Host "  Found stopped containers" -ForegroundColor Yellow
            Write-Host "  Run 'docker container prune' to remove them (optional)" -ForegroundColor Gray
        }
    } else {
        Write-Host "○ Docker not available - skipping Docker cleanup" -ForegroundColor Gray
    }
} catch {
    Write-Host "○ Docker not available - skipping Docker cleanup" -ForegroundColor Gray
}

# 13. Docker: Check for old volume data
Write-Host "`n[13/14] Checking Docker volumes..." -ForegroundColor Cyan
try {
    $null = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -eq 0) {
        $volumes = docker volume ls -q 2>$null
        if ($volumes) {
            $volumeCount = ($volumes | Measure-Object).Count
            Write-Host "  Found $volumeCount Docker volume(s)" -ForegroundColor Gray

            # Check for SMS-related volumes
            $smsVolumes = docker volume ls --format '{{.Name}}' 2>$null | Select-String -Pattern 'sms|student'
            if ($smsVolumes) {
                Write-Host "  SMS-related volumes:" -ForegroundColor Yellow
                foreach ($vol in $smsVolumes) {
                    Write-Host "    - $vol" -ForegroundColor Gray
                }
                Write-Host "  To remove unused volumes: 'docker volume prune' or 'docker volume rm <name>'" -ForegroundColor Gray
            }
        } else {
            Write-Host "  No Docker volumes found" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "○ Docker not available - skipping volume check" -ForegroundColor Gray
}

# 14. Docker: Check for old/unused Dockerfile variants
Write-Host "`n[14/14] Checking Dockerfile variants..." -ForegroundColor Cyan
$dockerfiles = Get-ChildItem -Path "docker" -Filter "Dockerfile*" -ErrorAction SilentlyContinue
if ($dockerfiles) {
    Write-Host "  Found Dockerfiles in docker/ directory:" -ForegroundColor Gray
    foreach ($df in $dockerfiles) {
        Write-Host "    - $($df.Name)" -ForegroundColor Gray
    }
    Write-Host "  Current setup uses: Dockerfile.backend, Dockerfile.frontend, Dockerfile.fullstack" -ForegroundColor Gray
    Write-Host "  All appear to be in active use" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
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
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host ""
