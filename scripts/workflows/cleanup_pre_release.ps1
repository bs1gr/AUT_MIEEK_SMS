<#
.SYNOPSIS
    Pre-Release Cleanup Script - Sanitize codebase before release

.DESCRIPTION
    Comprehensive cleanup script for v1.9.7 release:
    - Removes temporary files and build artifacts
    - Cleans Python/Node cache directories
    - Removes obsolete test databases
    - Preserves archived documentation
    - Maintains .gitkeep files for directory structure

.PARAMETER DryRun
    Show what would be deleted without actually deleting

.PARAMETER IncludeBackups
    Also clean backup directories (use with caution)

.EXAMPLE
    .\scripts\workflows\cleanup_pre_release.ps1 -DryRun
    Preview cleanup actions

.EXAMPLE
    .\scripts\workflows\cleanup_pre_release.ps1
    Execute cleanup

.NOTES
    Version: 1.0.0
    Date: 2025-12-04
    Part of v1.9.7 pre-release audit
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$IncludeBackups
)

$ErrorActionPreference = "Stop"

$workflowsDir = $PSScriptRoot
$scriptsDir   = Split-Path -Parent $workflowsDir
$rootDir      = Split-Path -Parent $scriptsDir

# Import shared cleanup utilities
. "$scriptsDir\lib\cleanup_common.ps1"

$script:CleanupCount = 0
$script:SpaceFreed = 0
$script:Errors = @()

function Write-Header {
    param([string]$Text)
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "$('=' * 70)" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Text)
    Write-Host "`n--- $Text ---" -ForegroundColor Yellow
}

function Remove-SafePath {
    param(
        [string]$Path,
        [string]$Description
    )
    
    $result = Remove-SafeItem -Path $Path -Description $Description -DryRun:$DryRun `
                               -SpaceFreedRef ([ref]$script:SpaceFreed) `
                               -CleanupCountRef ([ref]$script:CleanupCount)
    
    if (-not $result -and (Test-Path $Path)) {
        $script:Errors += "Failed to remove: $Description"
    }
}

# Note: Format-FileSize now provided by cleanup_common.ps1

# Main execution
try {
    Write-Header "PRE-RELEASE CLEANUP SCRIPT v1.0.0"
    
    if ($DryRun) {
        Write-Host "`n⚠️  DRY RUN MODE - No files will be deleted" -ForegroundColor Yellow
    } else {
        Write-Host "`n⚡ LIVE MODE - Files will be permanently deleted" -ForegroundColor Red
        Start-Sleep -Seconds 2
    }

    # 1. PYTHON CACHE CLEANUP
    Write-Section "Python Cache & Bytecode"
    
    Get-ChildItem -Path $rootDir -Filter "__pycache__" -Recurse -Directory -Force -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Python bytecode cache"
        }
    
    Get-ChildItem -Path $rootDir -Include "*.pyc", "*.pyo", "*.pyd" -Recurse -File -Force -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Python compiled file"
        }

    Remove-SafePath -Path "$rootDir\.pytest_cache" -Description "Pytest cache"
    Remove-SafePath -Path "$rootDir\.mypy_cache" -Description "Mypy cache"
    Remove-SafePath -Path "$rootDir\.ruff_cache" -Description "Ruff cache"
    Remove-SafePath -Path "$rootDir\backend\.pytest_cache" -Description "Backend pytest cache"
    Remove-SafePath -Path "$rootDir\backend\.mypy_cache" -Description "Backend mypy cache"
    Remove-SafePath -Path "$rootDir\backend\.ruff_cache" -Description "Backend ruff cache"

    # 2. NODE/FRONTEND CACHE CLEANUP
    Write-Section "Node & Frontend Cache"
    
    Remove-SafePath -Path "$rootDir\.cache" -Description "Cache directory"
    Remove-SafePath -Path "$rootDir\frontend\node_modules\.cache" -Description "Node modules cache"
    
    # Keep node_modules, but report size
    if (Test-Path "$rootDir\frontend\node_modules") {
        $nodeSize = (Get-ChildItem -Path "$rootDir\frontend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue | 
                     Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        Write-Host "  ℹ️  Keeping node_modules ($(Format-FileSize $nodeSize))" -ForegroundColor Cyan
    }

    # 3. TEMPORARY TEST ARTIFACTS
    Write-Section "Temporary Test Files"
    
    Remove-SafePath -Path "$rootDir\tmp_test_migrations" -Description "Temporary test migrations"
    Remove-SafePath -Path "$rootDir\backend\tests\__pycache__" -Description "Test cache"
    
    # CI/Test artifacts
    Get-ChildItem -Path $rootDir -Filter "tmp_artifacts*" -Directory -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Temporary CI artifacts"
        }
    
    Get-ChildItem -Path $rootDir -Filter "artifacts_run_*" -Directory -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Temporary run artifacts"
        }

    # 4. BUILD ARTIFACTS
    Write-Section "Build Artifacts"
    
    Remove-SafePath -Path "$rootDir\frontend\dist" -Description "Frontend build output"
    
    # Keep installer but report
    if (Test-Path "$rootDir\dist") {
        $distSize = (Get-ChildItem -Path "$rootDir\dist" -Recurse -Force -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        Write-Host "  ℹ️  Keeping dist/ directory (installers) - $(Format-FileSize $distSize)" -ForegroundColor Cyan
    }

    # 5. LOG FILES (keep directory structure)
    Write-Section "Log Files"
    
    if (Test-Path "$rootDir\backend\logs") {
        Get-ChildItem -Path "$rootDir\backend\logs" -Filter "*.log" -File -ErrorAction SilentlyContinue | 
            ForEach-Object {
                Remove-SafePath -Path $_.FullName -Description "Backend log file"
            }
    }
    
    if (Test-Path "$rootDir\logs") {
        Get-ChildItem -Path "$rootDir\logs" -Filter "*.log" -File -ErrorAction SilentlyContinue | 
            ForEach-Object {
                Remove-SafePath -Path $_.FullName -Description "Root log file"
            }
    }
    
    # Remove root-level dev logs
    Get-ChildItem -Path $rootDir -Filter "*dev_*.log" -File -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Development log"
        }
    
    Get-ChildItem -Path $rootDir -Filter "run*.log" -File -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Run log"
        }

    # 6. TEMPORARY SCRIPTS
    Write-Section "Temporary Scripts"
    
    Get-ChildItem -Path $rootDir -Filter "tmp_*.ps1" -File -Recurse -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Temporary PowerShell script"
        }
    
    Get-ChildItem -Path $rootDir -Filter "tmp_*.sh" -File -Recurse -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Temporary shell script"
        }
    
    Remove-SafePath -Path "$rootDir\watch_run.ps1" -Description "Temporary watch script"
    Remove-SafePath -Path "$rootDir\commit_msg.txt" -Description "Temporary commit message"
    Remove-SafePath -Path "$rootDir\cleanup_msg.txt" -Description "Temporary cleanup message"

    # 7. TEST DATABASES (not in data/ or backups/)
    Write-Section "Test Databases"
    
    Get-ChildItem -Path $rootDir -Filter "*.db" -File -Recurse -ErrorAction SilentlyContinue | 
        Where-Object { 
            $_.FullName -notmatch "\\data\\" -and 
            $_.FullName -notmatch "\\backups\\" 
        } | ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Test database"
        }

    # Remove WAL and SHM files
    Get-ChildItem -Path $rootDir -Include "*.db-wal", "*.db-shm" -File -Recurse -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Database journal file"
        }

    # 8. OLD BACKUPS (if requested)
    if ($IncludeBackups) {
        Write-Section "Old Backups (CAUTION)"
        Write-Host "  ⚠️  Backup cleanup requested" -ForegroundColor Yellow
        
        if (Test-Path "$rootDir\backups\pip-audit-report*.json") {
            Get-ChildItem -Path "$rootDir\backups" -Filter "pip-audit-report*.json" -File | 
                ForEach-Object {
                    Remove-SafePath -Path $_.FullName -Description "Old audit report backup"
                }
        }
        
        # Keep database backups
        Write-Host "  ℹ️  Database backups preserved in backups/" -ForegroundColor Cyan
    }

    # 9. IDE/EDITOR ARTIFACTS
    Write-Section "Editor Artifacts"
    
    Get-ChildItem -Path $rootDir -Include "*.swp", "*.swo", "*~" -File -Recurse -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Editor swap file"
        }

    # 10. PROCESS ID FILES
    Write-Section "Process ID Files"
    
    Remove-SafePath -Path "$rootDir\.backend.pid" -Description "Backend process ID"
    Remove-SafePath -Path "$rootDir\.frontend.pid" -Description "Frontend process ID"
    Get-ChildItem -Path $rootDir -Filter "*.pid" -File -ErrorAction SilentlyContinue | 
        ForEach-Object {
            Remove-SafePath -Path $_.FullName -Description "Process ID file"
        }

    # SUMMARY
    Write-Header "CLEANUP SUMMARY"
    
    Write-Host "`nItems processed: $script:CleanupCount" -ForegroundColor Cyan
    Write-Host "Space freed: $(Format-FileSize $script:SpaceFreed)" -ForegroundColor Green
    
    if ($DryRun) {
        Write-Host "`n✅ Dry run complete. Run without -DryRun to execute cleanup." -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
    }
    
    # PRESERVED ITEMS
    Write-Host "`n📁 Preserved directories:" -ForegroundColor Cyan
    Write-Host "  • data/ (production database)" -ForegroundColor Gray
    Write-Host "  • backups/ (database backups)" -ForegroundColor Gray
    Write-Host "  • archive/ (historical documentation)" -ForegroundColor Gray
    Write-Host "  • dist/ (installers)" -ForegroundColor Gray
    Write-Host "  • frontend/node_modules/ (dependencies)" -ForegroundColor Gray
    Write-Host "  • backend/.venv/ (Python environment)" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

exit 0
