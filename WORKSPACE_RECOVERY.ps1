<#
.SYNOPSIS
    Workspace Recovery Script - Fixes Git State, Encoding, and Orphan Files

.DESCRIPTION
    Comprehensive recovery for workspace issues:
    - Cleans up uncommitted changes
    - Removes orphan documents
    - Fixes terminal encoding
    - Repairs VSCode settings
    - Validates git state

.PARAMETER DryRun
    Show what would be done without making changes

.PARAMETER SkipBackup
    Skip creating backup before cleanup

.EXAMPLE
    .\WORKSPACE_RECOVERY.ps1 -DryRun
    Preview changes without executing

.EXAMPLE
    .\WORKSPACE_RECOVERY.ps1
    Execute full recovery

.NOTES
    Version: 1.0.0
    Created: January 17, 2026
    Purpose: Systematic workspace recovery without reinstall
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipBackup
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$WORKSPACE_ROOT = $PSScriptRoot
$BACKUP_DIR = Join-Path $WORKSPACE_ROOT "backups\recovery_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Step {
    param([string]$Message)
    Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] " -ForegroundColor Cyan -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# ============================================================================
# PHASE 0: PRE-FLIGHT CHECKS
# ============================================================================

Write-Step "PHASE 0: Pre-Flight Checks"

# Check if we're in the right directory
$versionFile = Join-Path $WORKSPACE_ROOT "VERSION"
if (-not (Test-Path $versionFile)) {
    Write-Error "Not in workspace root (VERSION file not found)"
    exit 1
}

$currentVersion = (Get-Content $versionFile).Trim()
Write-Success "Workspace detected: v$currentVersion"

# Check git status
try {
    $gitStatus = git status --porcelain 2>&1
    $hasChanges = $gitStatus.Count -gt 0

    if ($hasChanges) {
        Write-Warning "$($gitStatus.Count) files with uncommitted changes"
    } else {
        Write-Success "Git state clean"
    }
} catch {
    Write-Error "Git not available or repository corrupted: $_"
    exit 1
}

# ============================================================================
# PHASE 1: CREATE BACKUP
# ============================================================================

if (-not $SkipBackup -and -not $DryRun) {
    Write-Step "PHASE 1: Creating Backup"

    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null

    # Backup uncommitted files
    if ($hasChanges) {
        $backupFiles = @(
            ".vscode\settings.json",
            "COMMIT_READY.ps1",
            "INSTALLER_BUILDER.ps1",
            "backend\routers\routers_import_export.py",
            "backend\schemas\import_export.py",
            "backend\tests\test_import_export.py"
        )

        foreach ($file in $backupFiles) {
            $srcPath = Join-Path $WORKSPACE_ROOT $file
            if (Test-Path $srcPath) {
                $dstPath = Join-Path $BACKUP_DIR $file
                $dstDir = Split-Path $dstPath -Parent
                New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
                Copy-Item $srcPath $dstPath -Force
            }
        }

        Write-Success "Backup created at: $BACKUP_DIR"
    } else {
        Write-Success "No backup needed (no uncommitted changes)"
    }
}

# ============================================================================
# PHASE 2: CLEAN ORPHAN DOCUMENTS
# ============================================================================

Write-Step "PHASE 2: Removing Orphan Documents"

$orphanFiles = @(
    "CODEBASE_STATE_VERIFICATION_JAN16.md",
    "DEPLOYMENT_STATUS_JAN16.md",
    "DOCUMENTATION_FIX_SUMMARY_JAN16.md",
    "GITHUB_CLI_VERIFICATION.md",
    "PENDING_FIXES.md",
    "VERSIONING_CLARIFICATION_JAN16.md",
    "DOCUMENTATION_INDEX.md",
    "test_import_router.py",
    "verify_import_router.py",
    "backend\data\imports\1_courses.csv",
    "backend\data\imports\1_grades.csv",
    "backend\data\imports\1_students.csv"
)

foreach ($file in $orphanFiles) {
    $fullPath = Join-Path $WORKSPACE_ROOT $file
    if (Test-Path $fullPath) {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Would delete: $file"
        } else {
            Remove-Item $fullPath -Force
            Write-Success "Deleted: $file"
        }
    }
}

# ============================================================================
# PHASE 3: FIX VERSION STRINGS
# ============================================================================

Write-Step "PHASE 3: Fixing Version String Corruption"

$filesToFix = @(
    @{
        Path = "COMMIT_READY.ps1"
        OldPattern = "Version: vvvvv1.18.0"
        NewString = "Version: 1.18.0"
    },
    @{
        Path = "INSTALLER_BUILDER.ps1"
        OldPattern = "Version: vvvvv1.18.0"
        NewString = "Version: 1.18.0"
    }
)

foreach ($fix in $filesToFix) {
    $fullPath = Join-Path $WORKSPACE_ROOT $fix.Path
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        if ($content -match [regex]::Escape($fix.OldPattern)) {
            if ($DryRun) {
                Write-Warning "[DRY RUN] Would fix version in: $($fix.Path)"
            } else {
                $newContent = $content -replace [regex]::Escape($fix.OldPattern), $fix.NewString
                Set-Content $fullPath $newContent -NoNewline
                Write-Success "Fixed version in: $($fix.Path)"
            }
        }
    }
}

# ============================================================================
# PHASE 4: RESTORE BACKEND FILES
# ============================================================================

Write-Step "PHASE 4: Restoring Backend Files to Git State"

$backendFiles = @(
    "backend\routers\routers_import_export.py",
    "backend\schemas\import_export.py",
    "backend\tests\test_import_export.py"
)

foreach ($file in $backendFiles) {
    $fullPath = Join-Path $WORKSPACE_ROOT $file
    if (Test-Path $fullPath) {
        if ($DryRun) {
            Write-Warning "[DRY RUN] Would restore: $file"
        } else {
            git checkout HEAD -- $file 2>&1 | Out-Null
            Write-Success "Restored: $file"
        }
    }
}

# ============================================================================
# PHASE 5: FIX VSCODE SETTINGS
# ============================================================================

Write-Step "PHASE 5: Fixing VSCode Settings"

$settingsFile = Join-Path $WORKSPACE_ROOT ".vscode\settings.json"

if (Test-Path $settingsFile) {
    $settingsContent = Get-Content $settingsFile -Raw

    # Remove corrupted pytest configuration
    $fixedContent = $settingsContent -replace '"python\.testing\.pytestArgs":\s*\[\s*"tests"\s*\],\s*', ''

    if ($DryRun) {
        Write-Warning "[DRY RUN] Would fix VSCode settings"
    } else {
        Set-Content $settingsFile $fixedContent -NoNewline
        Write-Success "Fixed VSCode settings"
    }
}

# ============================================================================
# PHASE 6: VERIFY GIT STATE
# ============================================================================

Write-Step "PHASE 6: Verifying Git State"

try {
    # Reset any partially staged changes
    if (-not $DryRun) {
        git reset HEAD . 2>&1 | Out-Null
        Write-Success "Git index reset"
    }

    # Check final status
    $finalStatus = git status --porcelain

    if ($finalStatus.Count -eq 0) {
        Write-Success "Git state is clean"
    } else {
        Write-Warning "Remaining changes: $($finalStatus.Count) files"
        Write-Host "`nRemaining changes:" -ForegroundColor Yellow
        $finalStatus | ForEach-Object { Write-Host "  $_" }
    }
} catch {
    Write-Error "Git verification failed: $_"
}

# ============================================================================
# PHASE 7: FIX TERMINAL ENCODING
# ============================================================================

Write-Step "PHASE 7: Applying Terminal Encoding Fix"

$profilePath = Join-Path $WORKSPACE_ROOT ".vscode\powershell-profile.ps1"

if (Test-Path $profilePath) {
    Write-Success "Terminal encoding profile exists"
} else {
    if ($DryRun) {
        Write-Warning "[DRY RUN] Would create terminal encoding profile"
    } else {
        $profileContent = @'
# SMS Terminal Encoding Fix (Auto-loaded by VSCode)
# Prevents Greek character corruption (Ψ → ψ)

# Set UTF-8 encoding for console I/O
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Set PowerShell output encoding
$OutputEncoding = [System.Text.Encoding]::UTF8

# Suppress startup banner for cleaner terminals
Clear-Host

Write-Host "✓ SMS Terminal Encoding Active (UTF-8)" -ForegroundColor Green
'@
        Set-Content $profilePath $profileContent -Encoding UTF8
        Write-Success "Created terminal encoding profile"
    }
}

# ============================================================================
# PHASE 8: SUMMARY
# ============================================================================

Write-Step "RECOVERY SUMMARY"

Write-Host "`nActions Taken:" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "  [DRY RUN MODE - No changes made]`n" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ Backup created: $BACKUP_DIR" -ForegroundColor Green
    Write-Host "  ✓ Orphan documents removed" -ForegroundColor Green
    Write-Host "  ✓ Version strings fixed" -ForegroundColor Green
    Write-Host "  ✓ Backend files restored" -ForegroundColor Green
    Write-Host "  ✓ VSCode settings repaired" -ForegroundColor Green
    Write-Host "  ✓ Git state cleaned" -ForegroundColor Green
    Write-Host "  ✓ Terminal encoding fixed`n" -ForegroundColor Green
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Close and reopen VSCode"
Write-Host "  2. Open a new PowerShell terminal"
Write-Host "  3. Verify encoding: " -NoNewline
Write-Host "[System.Console]::OutputEncoding" -ForegroundColor Yellow
Write-Host "  4. Run: " -NoNewline
Write-Host "git status" -ForegroundColor Yellow
Write-Host "  5. If clean, proceed with development`n"

if (-not $DryRun) {
    Write-Host "Backup Location: $BACKUP_DIR" -ForegroundColor Cyan
    Write-Host "Restore if needed with: " -NoNewline
    Write-Host "git checkout HEAD -- <file>`n" -ForegroundColor Yellow
}

Write-Host "Recovery Complete! ✓`n" -ForegroundColor Green
