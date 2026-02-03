# ============================================================================
# EMERGENCY FIX - 400 Bad Request Error on Login
# ============================================================================
# This script completely cleans your existing SMS installation and prepares
# it for a fresh start with the new installer.
# ============================================================================

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║       SMS INSTALLATION - EMERGENCY CLEANUP & FIX (v1.17.7)    ║
║                                                                ║
║  This script will:                                            ║
║  1. Stop Docker container                                     ║
║  2. Remove old Docker images (1.12.3, 1.17.6)               ║
║  3. Delete old uninstaller files                              ║
║  4. Delete old .env files                                     ║
║  5. Preserve data/backups/logs/config                        ║
║  6. Verify cleanup is complete                               ║
║                                                                ║
║  WARNING: You should have SMS_Installer_1.17.7.exe ready     ║
║  to run AFTER this cleanup completes!                        ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Read-Host "Press ENTER to continue (or Ctrl+C to abort)"

$installPath = "C:\Program Files\SMS"
$backupDir = "$installPath\backups"

# ============================================================================
# PHASE 1: STOP DOCKER CONTAINER
# ============================================================================
Write-Host "`n[PHASE 1] Stopping Docker container..." -ForegroundColor Yellow

try {
    $running = docker ps --format "table {{.Names}}" | Select-String "sms-app"
    if ($running) {
        Write-Host "  Stopping sms-app container..." -ForegroundColor Cyan
        docker stop sms-app -t 10 | Out-Null
        Write-Host "  ✓ Container stopped" -ForegroundColor Green
    } else {
        Write-Host "  ℹ Container not running" -ForegroundColor Blue
    }
} catch {
    Write-Host "  ⚠ Docker not accessible (this is OK)" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 2: REMOVE OLD DOCKER IMAGES
# ============================================================================
Write-Host "`n[PHASE 2] Removing old Docker images..." -ForegroundColor Yellow

$oldImages = @("1.12.3", "1.17.6")
foreach ($version in $oldImages) {
    try {
        $image = "sms-fullstack:$version"
        docker images --format "table {{.Repository}}:{{.Tag}}" | Select-String $image | Out-Null
        if ($?) {
            Write-Host "  Removing $image..." -ForegroundColor Cyan
            docker rmi $image -f 2>&1 | Out-Null
            Write-Host "  ✓ Removed: $image" -ForegroundColor Green
        } else {
            Write-Host "  ℹ $image not found" -ForegroundColor Blue
        }
    } catch {
        Write-Host "  ⚠ Could not remove $image" -ForegroundColor Yellow
    }
}

# ============================================================================
# PHASE 3: DELETE OLD UNINSTALLER FILES
# ============================================================================
Write-Host "`n[PHASE 3] Removing old uninstaller files..." -ForegroundColor Yellow

if (Test-Path $installPath) {
    # Patterns to delete
    $patterns = @("unins000.*", "unins1.12.3.*", "unins1.17.6.*", "unins1.17.5.*")
    
    foreach ($pattern in $patterns) {
        Get-ChildItem "$installPath" -Filter $pattern -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item $_.FullName -Force
                Write-Host "  ✓ Deleted: $($_.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to delete: $($_.Name)" -ForegroundColor Red
                Write-Host "    Error: $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  ⚠ Installation directory not found at $installPath" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 4: DELETE OLD .ENV FILES
# ============================================================================
Write-Host "`n[PHASE 4] Removing old .env files..." -ForegroundColor Yellow

if (Test-Path $installPath) {
    # Delete old .env files from root
    Get-ChildItem "$installPath" -Filter ".env*" -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Remove-Item $_.FullName -Force
            Write-Host "  ✓ Deleted: $($_.Name) (timestamp: $($_.LastWriteTime))" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to delete: $($_.Name)" -ForegroundColor Red
        }
    }
    
    # Delete old .env files from backend directory
    $backendPath = "$installPath\backend"
    if (Test-Path $backendPath) {
        Get-ChildItem "$backendPath" -Filter ".env*" -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item $_.FullName -Force
                Write-Host "  ✓ Deleted: backend\$($_.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to delete: backend\$($_.Name)" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  ⚠ Installation directory not found at $installPath" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 5: VERIFY CLEANUP
# ============================================================================
Write-Host "`n[PHASE 5] Verifying cleanup..." -ForegroundColor Yellow

$cleanupStatus = $true

if (Test-Path $installPath) {
    # Check for remaining uninstaller files
    $uninstallers = Get-ChildItem "$installPath" -Filter "unins*" -Force -ErrorAction SilentlyContinue
    if ($uninstallers) {
        Write-Host "  ✗ Old uninstaller files still present:" -ForegroundColor Red
        $uninstallers | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Red }
        $cleanupStatus = $false
    } else {
        Write-Host "  ✓ No old uninstaller files found" -ForegroundColor Green
    }
    
    # Check for old .env files
    $envFiles = Get-ChildItem "$installPath" -Filter ".env*" -Force -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) }
    if ($envFiles) {
        Write-Host "  ✗ Old .env files still present:" -ForegroundColor Red
        $envFiles | ForEach-Object { Write-Host "    - $($_.Name) (modified: $($_.LastWriteTime))" -ForegroundColor Red }
        $cleanupStatus = $false
    } else {
        Write-Host "  ✓ No old .env files found" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ Installation directory not accessible" -ForegroundColor Yellow
}

# Check Docker status
try {
    $images = docker images --format "table {{.Repository}}:{{.Tag}}" | Select-String "sms-fullstack:1.12.3|sms-fullstack:1.17.6"
    if ($images) {
        Write-Host "  ✗ Old Docker images still present:" -ForegroundColor Red
        $images | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
        $cleanupStatus = $false
    } else {
        Write-Host "  ✓ No old Docker images found" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Could not check Docker images" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 6: FINAL STATUS
# ============================================================================
Write-Host "`n[PHASE 6] Cleanup Status..." -ForegroundColor Yellow

if ($cleanupStatus) {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║              ✓ CLEANUP COMPLETE & VERIFIED                    ║
║                                                                ║
║  Your installation is now clean and ready for upgrade!       ║
║                                                                ║
║  NEXT STEPS:                                                  ║
║  1. Download SMS_Installer_1.17.7.exe                        ║
║  2. Run the installer                                         ║
║  3. Launch SMS from Start Menu                                ║
║  4. Login and verify no 400 errors                            ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
} else {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║        ⚠ CLEANUP INCOMPLETE - MANUAL ACTION REQUIRED          ║
║                                                                ║
║  Some files could not be automatically removed.               ║
║  See above for details.                                        ║
║                                                                ║
║  Try these manual steps:                                      ║
║  1. Open File Explorer                                        ║
║  2. Navigate to: C:\Program Files\SMS                         ║
║  3. Delete the old uninstaller files (unins*.exe, unins*.dat) ║
║  4. Delete any .env files                                     ║
║  5. Run this script again                                     ║
║  6. If still failing, open Task Manager                       ║
║     - Check if any SMS processes are running                  ║
║     - Kill them and retry cleanup                             ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow
}

Write-Host "`nPress ENTER to exit..." -ForegroundColor Cyan
Read-Host
