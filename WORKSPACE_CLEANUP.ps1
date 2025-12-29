#Requires -Version 7.0

<#
.SYNOPSIS
    Comprehensive workspace cleanup and organization script

.DESCRIPTION
    Performs complete workspace cleanup:
    1. Removes temporary test outputs (*.txt files in root)
    2. Cleans obsolete/deprecated scripts and docs
    3. Organizes documentation into proper directories
    4. Removes build artifacts and caches
    5. Updates .gitignore for new patterns
    6. Validates workspace structure

.PARAMETER Mode
    Cleanup mode:
    - 'quick'   : Remove temp files only (2 min)
    - 'standard': Standard cleanup + organize docs (5 min)
    - 'deep'    : Full cleanup including caches (10 min)
    Default: standard

.PARAMETER DryRun
    Preview changes without executing them

.PARAMETER SkipDocs
    Don't organize documentation

.PARAMETER SkipTests
    Skip test validation after cleanup

.EXAMPLE
    .\WORKSPACE_CLEANUP.ps1 -DryRun
    Preview what would be cleaned

.EXAMPLE
    .\WORKSPACE_CLEANUP.ps1 -Mode quick
    Quick cleanup of temp files

.EXAMPLE
    .\WORKSPACE_CLEANUP.ps1 -Mode deep
    Deep cleanup including all caches

.EXAMPLE
    .\WORKSPACE_CLEANUP.ps1 -Mode post-release
    Cleanup after completing a release (organize release artifacts)

.NOTES
    Version: 1.1
    Part of v1.12.9+ release preparation
    Added post-release mode for organizing release artifacts
#>

[CmdletBinding()]
param(
    [ValidateSet('quick', 'standard', 'deep', 'post-release')]
    [string]$Mode = 'standard',

    [switch]$DryRun,
    [switch]$SkipDocs,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot

# Import cleanup utilities if available
$cleanupLib = Join-Path $rootDir "scripts\lib\cleanup_common.ps1"
if (Test-Path $cleanupLib) {
    . $cleanupLib
    $hasCleanupLib = $true
} else {
    $hasCleanupLib = $false
    # Fallback functions
    function Format-FileSize {
        param([long]$Bytes)
        if ($Bytes -eq 0) { return "0 B" }
        $sizes = @("B", "KB", "MB", "GB", "TB")
        $order = [Math]::Min([Math]::Floor([Math]::Log($Bytes, 1024)), $sizes.Length - 1)
        $size = [Math]::Round($Bytes / [Math]::Pow(1024, $order), 2)
        return "$size $($sizes[$order])"
    }
}

# Statistics
$script:CleanupCount = 0
$script:SpaceFreed = 0
$script:MovedCount = 0
$script:Errors = @()

# Color output
function Write-Phase { param([string]$Text) Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta; Write-Host "║  $Text" -ForegroundColor Magenta; Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Magenta }
function Write-Section { param([string]$Text) Write-Host "`n--- $Text ---" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }

function Remove-Item-Safe {
    param(
        [string]$Path,
        [string]$Description
    )

    if (-not (Test-Path $Path)) {
        return $false
    }

    try {
        $size = 0
        if (Test-Path $Path -PathType Container) {
            $size = (Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue |
                     Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        } else {
            $size = (Get-Item $Path -ErrorAction SilentlyContinue).Length
        }
        if ($null -eq $size) { $size = 0 }

        if ($DryRun) {
            Write-Host "  [DRY RUN] Would remove: $Description ($(Format-FileSize $size))" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Success "Removed: $Description ($(Format-FileSize $size))"
            $script:SpaceFreed += $size
            $script:CleanupCount++
        }
        return $true
    } catch {
        Write-Error "Failed to remove $Description : $_"
        $script:Errors += "Failed: $Description"
        return $false
    }
}

function Move-Item-Safe {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Description
    )

    if (-not (Test-Path $Source)) {
        return $false
    }

    try {
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would create: $destDir" -ForegroundColor DarkGray
            } else {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
        }

        if ($DryRun) {
            Write-Host "  [DRY RUN] Would move: $Description" -ForegroundColor DarkGray
            Write-Host "            From: $Source" -ForegroundColor DarkGray
            Write-Host "            To: $Destination" -ForegroundColor DarkGray
        } else {
            Move-Item -Path $Source -Destination $Destination -Force -ErrorAction Stop
            Write-Success "Moved: $Description"
            $script:MovedCount++
        }
        return $true
    } catch {
        Write-Error "Failed to move $Description : $_"
        $script:Errors += "Failed to move: $Description"
        return $false
    }
}

# ============================================================================
# PHASE 1: REMOVE TEMPORARY TEST OUTPUT FILES
# ============================================================================
Write-Phase "PHASE 1: Temporary Test Outputs"

Write-Section "Test Output Files in Root"

# All the admin bootstrap test outputs
$testOutputs = @(
    "admin_bootstrap_test_output.txt",
    "admin_bootstrap_test_output2.txt",
    "admin_bootstrap_test_output3.txt",
    "admin_bootstrap_test_output4.txt",
    "admin_bootstrap_test_output5.txt",
    "admin_bootstrap_test_output6.txt",
    "admin_bootstrap_test_output7.txt",
    "admin_bootstrap_test_output8.txt",
    "admin_bootstrap_test_output9.txt",
    "admin_bootstrap_test_output10.txt",
    "backend_test_output.txt",
    "students_router_test_output.txt",
    "test_students_router_verbose.log"
)

foreach ($file in $testOutputs) {
    $path = Join-Path $rootDir $file
    Remove-Item-Safe -Path $path -Description "Test output: $file"
}

# ============================================================================
# PHASE 2: REMOVE OBSOLETE/DEPRECATED SCRIPTS AND DOCS
# ============================================================================
Write-Phase "PHASE 2: Obsolete & Deprecated Files"

Write-Section "Deprecated Scripts"

$deprecatedScripts = @(
    "SMS.ps1",  # Replaced by DOCKER.ps1 and NATIVE.ps1
    "DOCKER_TOGGLE.bat",  # Old batch file
    "COMMIT_READY_WRAPPER.ps1",  # Wrapper not needed
    "FINALIZE_WORKFLOWS.ps1",  # One-time script
    "SECURITY_FIX_2025-12-27.ps1",  # One-time security fix
    "docker_seed_e2e.py",  # Old seed script
    "e2e-local.ps1",  # Old e2e script
    "fix_greek_encoding_permanent.py"  # One-time fix
)

foreach ($script in $deprecatedScripts) {
    $path = Join-Path $rootDir $script
    Remove-Item-Safe -Path $path -Description "Deprecated script: $script"
}

Write-Section "Obsolete Documentation"

# Temporary/session docs
$tempDocs = @(
    "tmp_pr_summary.md",
    "tmp_pr_update.md",
    "SESSION_COMPLETION_SUMMARY.md",
    "README_SESSION_COMPLETE.md",
    "DOCUMENTATION_INDEX_SESSION.md",
    "SOLUTION_SUMMARY.md"
)

foreach ($doc in $tempDocs) {
    $path = Join-Path $rootDir $doc
    Remove-Item-Safe -Path $path -Description "Temporary doc: $doc"
}

# One-time audit/fix reports (move to archive)
$auditReports = @(
    "CODEQL_FIXES_2025-12-27.md",
    "COMPLETE_SECURITY_ALERT_ANALYSIS_2025-12-27.md",
    "SECURITY_AUDIT_COMPLETION_REPORT_2025-12-27.md",
    "SECURITY_AUDIT_REPORT_2025-12-27.md",
    "SECURITY_HARDENING_COMPLETE_2025-12-27.md",
    "SECURITY_FIXES_SUMMARY.md",
    "BACKUP_VERIFICATION_INVESTIGATION_2025-12-18.md",
    "BACKUP_VERIFICATION_REPORT_2025-12-18.md",
    "PROJECT_STATUS_REPORT_2025-12-18.md",
    "CODE_CHANGES_SUMMARY.md",
    "DOCUMENTATION_UPDATE_SUMMARY_v1.12.8.md",
    "FINAL_VALIDATION_REPORT.md",
    "TEST_VALIDATION_REPORT.md",
    "WORK_COMPLETION_CHECKLIST.md",
    "TRIVY_CONFIGURATION_FIX.md"
)

$archiveDir = Join-Path $rootDir "docs\archive\reports-2025-12"
if (-not $DryRun -and -not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Info "Created archive directory: $archiveDir"
}

foreach ($report in $auditReports) {
    $source = Join-Path $rootDir $report
    if (Test-Path $source) {
        $dest = Join-Path $archiveDir $report
        Move-Item-Safe -Source $source -Destination $dest -Description "Audit report: $report"
    }
}

# ============================================================================
# PHASE 3: ORGANIZE DOCUMENTATION
# ============================================================================
if (-not $SkipDocs) {
    Write-Phase "PHASE 3: Organize Documentation"

    Write-Section "Release Documentation"

    Write-Info "Keeping high-visibility release guides in root for easy access"
    Write-Info "These are referenced by README.md and other documentation"

    # Keep these in root - they're actively referenced by other docs and users
    $keepInRoot = @(
        "QUICK_RELEASE_GUIDE.md",
        "RELEASE_COMMAND_REFERENCE.md",
        "RELEASE_DOCUMENTATION_GUIDE.md",
        "RELEASE_PREPARATION_CHECKLIST.md",
        "RELEASE_PREPARATION_SCRIPT_GUIDE.md"
    )

    # Move detailed implementation docs to docs/development/release-workflow/
    $releaseDocsDir = Join-Path $rootDir "docs\development\release-workflow"
    if (-not $DryRun -and -not (Test-Path $releaseDocsDir)) {
        New-Item -ItemType Directory -Path $releaseDocsDir -Force | Out-Null
        Write-Info "Created: $releaseDocsDir"
    }

    $releaseDocs = @{
        "COMPLETE_RELEASE_WORKFLOW.md" = "docs\development\release-workflow\COMPLETE_RELEASE_WORKFLOW.md"
        "WORKFLOW_ARCHITECTURE_DETAILED.md" = "docs\development\release-workflow\WORKFLOW_ARCHITECTURE_DETAILED.md"
        "WORKFLOW_DOCUMENTATION_INDEX.md" = "docs\development\release-workflow\WORKFLOW_DOCUMENTATION_INDEX.md"
        "WORKFLOW_TRIGGERING_IMPROVEMENTS.md" = "docs\development\release-workflow\WORKFLOW_TRIGGERING_IMPROVEMENTS.md"
        "WORKFLOW_VERIFICATION_CHECKLIST.md" = "docs\development\release-workflow\WORKFLOW_VERIFICATION_CHECKLIST.md"
        "FILES_SUMMARY.md" = "docs\development\release-workflow\FILES_SUMMARY.md"
        "START_HERE.md" = "docs\development\release-workflow\START_HERE.md"
    }

    foreach ($doc in $releaseDocs.Keys) {
        $source = Join-Path $rootDir $doc
        $dest = Join-Path $rootDir $releaseDocs[$doc]
        if (Test-Path $source) {
            Move-Item-Safe -Source $source -Destination $dest -Description "Release workflow doc: $doc"
        }
    }

    Write-Section "Process Documentation"

    # Move workflow consolidation docs to docs/development/
    $devDocsDir = Join-Path $rootDir "docs\development"
    if (-not $DryRun -and -not (Test-Path $devDocsDir)) {
        New-Item -ItemType Directory -Path $devDocsDir -Force | Out-Null
    }

    $workflowDocs = @{
        "WORKFLOW_CONSOLIDATION_INDEX.md" = "docs\development\WORKFLOW_CONSOLIDATION_INDEX.md"
        "WORKFLOW_CONSOLIDATION_REPORT.md" = "docs\development\WORKFLOW_CONSOLIDATION_REPORT.md"
        "WORKFLOW_CONSOLIDATION_SUMMARY.md" = "docs\development\WORKFLOW_CONSOLIDATION_SUMMARY.md"
        "WORKFLOW_IMPLEMENTATION_SUMMARY.md" = "docs\development\WORKFLOW_IMPLEMENTATION_SUMMARY.md"
    }

    foreach ($doc in $workflowDocs.Keys) {
        $source = Join-Path $rootDir $doc
        $dest = Join-Path $rootDir $workflowDocs[$doc]
        if (Test-Path $source) {
            Move-Item-Safe -Source $source -Destination $dest -Description "Workflow doc: $doc"
        }
    }

    Write-Section "Process Guides"

    # Move process guides to docs/processes/
    $processDocsDir = Join-Path $rootDir "docs\processes"
    if (-not $DryRun -and -not (Test-Path $processDocsDir)) {
        New-Item -ItemType Directory -Path $processDocsDir -Force | Out-Null
    }

    $processDocs = @{
        "AUTOMATION_PROCESS.md" = "docs\processes\AUTOMATION_PROCESS.md"
        "RELEASE_AUTOMATION_GUIDE.md" = "docs\processes\RELEASE_AUTOMATION_GUIDE.md"
        "BACKUP_VERIFICATION_AUTOMATION.md" = "docs\processes\BACKUP_VERIFICATION_AUTOMATION.md"
        "AUTOMATED_SCANNING_SETUP.md" = "docs\processes\AUTOMATED_SCANNING_SETUP.md"
        "SECRET_SCANNING_SETUP.md" = "docs\processes\SECRET_SCANNING_SETUP.md"
        "SECURITY_AUDIT_SCHEDULE.md" = "docs\processes\SECURITY_AUDIT_SCHEDULE.md"
        "BENCHMARKING_PROCESS.md" = "docs\processes\BENCHMARKING_PROCESS.md"
        "LOAD_TESTING_PROCESS.md" = "docs\processes\LOAD_TESTING_PROCESS.md"
        "METRICS_EXPORT_GUIDE.md" = "docs\processes\METRICS_EXPORT_GUIDE.md"
    }

    foreach ($doc in $processDocs.Keys) {
        $source = Join-Path $rootDir $doc
        $dest = Join-Path $rootDir $processDocs[$doc]
        if (Test-Path $source) {
            Move-Item-Safe -Source $source -Destination $dest -Description "Process guide: $doc"
        }
    }

    Write-Section "Implementation Plans"

    # Move RBAC and installer improvement docs
    $plansDir = Join-Path $rootDir "docs\plans"
    if (-not $DryRun -and -not (Test-Path $plansDir)) {
        New-Item -ItemType Directory -Path $plansDir -Force | Out-Null
    }

    $planDocs = @{
        "RBAC_PHASE2.4_PLAN.md" = "docs\plans\RBAC_PHASE2.4_PLAN.md"
        "INSTALLER_IMPROVEMENTS_v1.12.3+.md" = "docs\plans\INSTALLER_IMPROVEMENTS_v1.12.3+.md"
    }

    foreach ($doc in $planDocs.Keys) {
        $source = Join-Path $rootDir $doc
        $dest = Join-Path $rootDir $planDocs[$doc]
        if (Test-Path $source) {
            Move-Item-Safe -Source $source -Destination $dest -Description "Plan doc: $doc"
        }
    }

    Write-Section "Audit Summary (Keep in Root)"
    Write-Info "Keeping SECURITY_AUDIT_SUMMARY.md in root (important reference)"

    Write-Section "Additional Documentation Organization"

    # Ensure common documentation directories exist
    $docDirs = @(
        "docs\ci",
        "docs\deployment\reports",
        "docs\releases\reports",
        "docs\reports",
        "docs\development\testing",
        "docs\development\release-workflow",
        "docs\development\ai",
        "docs\plans",
        "docs\misc"
    )
    foreach ($d in $docDirs) {
        $abs = Join-Path $rootDir $d
        if (-not $DryRun -and -not (Test-Path $abs)) { New-Item -ItemType Directory -Path $abs -Force | Out-Null }
    }

    # Helper: Determine YYYY-MM bucket from filename
    function Get-DateBucketFromName {
        param([string]$Name)
        $nowBucket = (Get-Date).ToString('yyyy-MM')
        $m = [regex]::Match($Name, '(?<y>20\d{2})[-_](?<m>0[1-9]|1[0-2])([-_](?<d>0[1-9]|[12]\d|3[01]))?')
        if ($m.Success) {
            return ("{0}-{1}" -f $m.Groups['y'].Value, $m.Groups['m'].Value)
        }
        return $nowBucket
    }

    # Whitelist of root-level docs to keep for quick access
    $keepRootDocs = @(
        'README.md','CHANGELOG.md','LICENSE','CONTRIBUTING.md','CODE_OF_CONDUCT.md',
        'DOCUMENTATION_INDEX.md',
        'QUICK_RELEASE_GUIDE.md','RELEASE_COMMAND_REFERENCE.md','RELEASE_DOCUMENTATION_GUIDE.md',
        'RELEASE_PREPARATION_CHECKLIST.md','RELEASE_PREPARATION_SCRIPT_GUIDE.md',
        'SECURITY_AUDIT_SUMMARY.md'
    )

    # Pattern-based movers from root → docs/
    $patternMoves = @(
        @{ Pattern = '^(?i)GITHUB_ACTIONS_.*\.md$';            Dest = 'docs\ci' },
        @{ Pattern = '^(?i)E2E_.*\.md$';                        Dest = 'docs\development\testing' },
        @{ Pattern = '^(?i)e2e-.*\.md$';                        Dest = 'docs\development\testing' },
        @{ Pattern = '^(?i)DEPLOYMENT_REPORT_.*\.md$';          Dest = 'docs\deployment\reports' },
        @{ Pattern = '^(?i)RELEASE_v.*_COMPLETE\.md$';          Dest = 'docs\releases\reports' },
        @{ Pattern = '^(?i)POST_RELEASE_CLEANUP_GUIDE\.md$';    Dest = 'docs\development\release-workflow' },
        @{ Pattern = '^(?i)LLM_AGENT_INSTRUCTIONS\.md$';        Dest = 'docs\development\ai' },
        @{ Pattern = '^(?i)E2E_TESTING_IMPROVEMENTS\.md$';      Dest = 'docs\development\testing' },
        @{ Pattern = '^(?i)REMAINING_ISSUES_PRIORITY_PLAN\.md$';Dest = 'docs\plans' }
    )

    # Move summary-like reports to dated buckets
    $summaryPatterns = @('SUMMARY','REPORT','INVESTIGATION','VALIDATION','STATUS','CLEANUP')

    Get-ChildItem -Path $rootDir -Filter '*.md' -File -ErrorAction SilentlyContinue |
        Where-Object { $keepRootDocs -notcontains $_.Name } |
        ForEach-Object {
            $moved = $false

            # First, try explicit pattern moves
            foreach ($rule in $patternMoves) {
                if ($_.Name -match $rule.Pattern) {
                    $destPath = Join-Path $rootDir $rule.Dest
                    $dest = Join-Path $destPath $_.Name
                    Move-Item-Safe -Source $_.FullName -Destination $dest -Description "Doc: $($_.Name)"
                    $moved = $true; break
                }
            }

            if (-not $moved) {
                # Then, catch generic summary/report-like docs into dated reports bucket
                if ($_.Name -match '(?i)SUMMARY|REPORT|INVESTIGATION|VALIDATION|STATUS|CLEANUP') {
                    $bucket = Get-DateBucketFromName -Name $_.Name
                    $bucketDir = Join-Path $rootDir ("docs\\reports\\$bucket")
                    if (-not $DryRun -and -not (Test-Path $bucketDir)) { New-Item -ItemType Directory -Path $bucketDir -Force | Out-Null }
                    $dest = Join-Path $bucketDir $_.Name
                    Move-Item-Safe -Source $_.FullName -Destination $dest -Description "Report: $($_.Name)"
                }
                else {
                    # Otherwise, place remaining stray docs under docs/misc
                    $misc = Join-Path $rootDir 'docs\misc'
                    $destMisc = Join-Path $misc $_.Name
                    Move-Item-Safe -Source $_.FullName -Destination $destMisc -Description "Misc doc: $($_.Name)"
                }
            }
        }

    # Move session/final text reports (.txt) to dated reports bucket as well
    Get-ChildItem -Path $rootDir -Filter '*.txt' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '(?i)SUMMARY|SESSION|REPORT' } |
        ForEach-Object {
            $bucket = Get-DateBucketFromName -Name $_.Name
            $bucketDir = Join-Path $rootDir ("docs\\reports\\$bucket")
            if (-not $DryRun -and -not (Test-Path $bucketDir)) { New-Item -ItemType Directory -Path $bucketDir -Force | Out-Null }
            $dest = Join-Path $bucketDir $_.Name
            Move-Item-Safe -Source $_.FullName -Destination $dest -Description "Text report: $($_.Name)"
        }

    # Move WORKFLOW_FIXES folder into release-workflow docs, if present
    $workflowFixes = Join-Path $rootDir 'WORKFLOW_FIXES'
    if (Test-Path $workflowFixes -PathType Container) {
        $destDir = Join-Path $rootDir 'docs\development\release-workflow\WORKFLOW_FIXES'
        if (-not $DryRun -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        try {
            Get-ChildItem -Path $workflowFixes -File -Recurse -Force | ForEach-Object {
                $rel = $_.FullName.Substring($workflowFixes.Length).TrimStart([char[]]"/\")
                $destPath = Join-Path $destDir $rel
                Move-Item-Safe -Source $_.FullName -Destination $destPath -Description "WORKFLOW_FIXES: $($rel)"
            }
            # Clean up directory if empty
            if (-not $DryRun) {
                Remove-Item $workflowFixes -Recurse -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Warning "Could not move WORKFLOW_FIXES: $_"
        }
    }

    # Move root e2e error folders into test-results/e2e/
    Get-ChildItem -Path $rootDir -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(?i)e2e-error-' } |
        ForEach-Object {
            $targetDir = Join-Path $rootDir 'test-results\e2e'
            if (-not $DryRun -and -not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
            $dest = Join-Path $targetDir $_.Name
            Move-Item-Safe -Source $_.FullName -Destination $dest -Description "E2E error folder: $($_.Name)"
        }
}

# ============================================================================
# PHASE 3.5: POST-RELEASE CLEANUP (if post-release mode)
# ============================================================================
if ($Mode -eq 'post-release') {
    Write-Phase "PHASE 3.5: Post-Release Cleanup"

    Write-Section "Release Artifacts in Root"

    # Move any RELEASE_NOTES_*.md files that ended up in root
    Get-ChildItem -Path $rootDir -Filter "RELEASE_NOTES_v*.md" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $releaseDocsDir = Join-Path $rootDir "docs\releases"
            if (-not $DryRun -and -not (Test-Path $releaseDocsDir)) {
                New-Item -ItemType Directory -Path $releaseDocsDir -Force | Out-Null
            }
            $dest = Join-Path $releaseDocsDir $_.Name
            Move-Item-Safe -Source $_.FullName -Destination $dest -Description "Release notes: $($_.Name)"
        }

    # Move any GITHUB_RELEASE_*.md files
    Get-ChildItem -Path $rootDir -Filter "GITHUB_RELEASE_v*.md" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $releaseDocsDir = Join-Path $rootDir "docs\releases"
            if (-not $DryRun -and -not (Test-Path $releaseDocsDir)) {
                New-Item -ItemType Directory -Path $releaseDocsDir -Force | Out-Null
            }
            $dest = Join-Path $releaseDocsDir $_.Name
            Move-Item-Safe -Source $_.FullName -Destination $dest -Description "GitHub release: $($_.Name)"
        }

    Write-Section "Version-Specific Release Notes in Root"

    # Check for old release notes patterns
    Get-ChildItem -Path $rootDir -Filter "RELEASE_NOTES_v*.md" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            Write-Info "Found release notes in root: $($_.Name)"
        }

    Write-Section "Temporary Release Files"

    # Remove temporary release commit messages
    $tempReleaseFiles = @(
        "release_commit_msg.txt",
        "release_notes_temp.md",
        "github_release_draft.md"
    )

    foreach ($file in $tempReleaseFiles) {
        $path = Join-Path $rootDir $file
        if (Test-Path $path) {
            Remove-Item-Safe -Path $path -Description "Temp release file: $file"
        }
    }

    Write-Section "Installer Artifacts"

    # Ensure installer executables are in dist/ not root
    Get-ChildItem -Path $rootDir -Filter "*.exe" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "StudentManagement*" -or $_.Name -like "SMS_Installer*" } |
        ForEach-Object {
            $distDir = Join-Path $rootDir "dist"
            if (-not $DryRun -and -not (Test-Path $distDir)) {
                New-Item -ItemType Directory -Path $distDir -Force | Out-Null
            }
            $dest = Join-Path $distDir $_.Name
            Move-Item-Safe -Source $_.FullName -Destination $dest -Description "Installer: $($_.Name)"
        }

    Write-Info "Post-release cleanup focuses on organizing release artifacts"
}

# ============================================================================
# PHASE 4: CLEAN BUILD ARTIFACTS & CACHES
# ============================================================================
if ($Mode -eq 'deep' -or $Mode -eq 'standard' -or $Mode -eq 'post-release') {
    Write-Phase "PHASE 4: Build Artifacts & Caches"

    Write-Section "Temporary Directories"

    $tempDirs = @(
        "tmp_artifacts",
        "tmp_test_migrations",
        "artifacts_run_20433692089",
        "artifacts_run_20433984258",
        "tmp_e2e_artifacts"
    )

    foreach ($dir in $tempDirs) {
        $path = Join-Path $rootDir $dir
        Remove-Item-Safe -Path $path -Description "Temp directory: $dir"
    }

    # Artifacts zip files
    Get-ChildItem -Path $rootDir -Filter "artifacts_run_*.zip" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            Remove-Item-Safe -Path $_.FullName -Description "Artifacts zip: $($_.Name)"
        }
}

if ($Mode -eq 'deep') {
    Write-Section "Python Caches"

    $pythonCaches = @(
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "backend\.pytest_cache",
        "backend\.mypy_cache",
        "backend\.ruff_cache"
    )

    foreach ($cache in $pythonCaches) {
        $path = Join-Path $rootDir $cache
        Remove-Item-Safe -Path $path -Description "Python cache: $cache"
    }

    # __pycache__ directories
    Get-ChildItem -Path $rootDir -Filter "__pycache__" -Recurse -Directory -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.venv*" } |
        ForEach-Object {
            Remove-Item-Safe -Path $_.FullName -Description "Python bytecode: $($_.FullName.Replace($rootDir, '.'))"
        }

    Write-Section "Frontend Build Cache"

    Remove-Item-Safe -Path (Join-Path $rootDir "frontend\dist") -Description "Frontend build output"
}

# ============================================================================
# PHASE 5: UPDATE .GITIGNORE
# ============================================================================
Write-Phase "PHASE 5: Update .gitignore"

$gitignorePath = Join-Path $rootDir ".gitignore"
$gitignoreContent = Get-Content $gitignorePath -Raw

$patternsToAdd = @(
    "# Test output files",
    "admin_bootstrap_test_output*.txt",
    "backend_test_output.txt",
    "students_router_test_output.txt",
    "test_*.log",
    "",
    "# Temporary markdown files",
    "tmp_*.md",
    "SESSION_*.md",
    "README_SESSION*.md",
    "",
    "# Archive directories",
    "docs/archive/"
)

$needsUpdate = $false
foreach ($pattern in $patternsToAdd) {
    if ($pattern -and -not $gitignoreContent.Contains($pattern)) {
        $needsUpdate = $true
        break
    }
}

if ($needsUpdate) {
    if ($DryRun) {
        Write-Info "[DRY RUN] Would update .gitignore with new patterns"
    } else {
        $newContent = $gitignoreContent.TrimEnd() + "`n`n" + ($patternsToAdd -join "`n") + "`n"
        Set-Content -Path $gitignorePath -Value $newContent -NoNewline
        Write-Success "Updated .gitignore with new patterns"
    }
} else {
    Write-Info ".gitignore already up to date"
}

# ============================================================================
# PHASE 6: VALIDATION
# ============================================================================
if (-not $SkipTests -and -not $DryRun) {
    Write-Phase "PHASE 6: Validation"

    Write-Section "Verify Critical Files Exist"

    $criticalFiles = @(
        "README.md",
        "VERSION",
        "CHANGELOG.md",
        "LICENSE",
        "pyproject.toml",
        "DOCKER.ps1",
        "NATIVE.ps1",
        "COMMIT_READY.ps1",
        "RELEASE_PREPARATION.ps1",
        "RELEASE_READY.ps1",
        "GENERATE_RELEASE_DOCS.ps1",
        "RELEASE_WITH_DOCS.ps1"
    )

    $allPresent = $true
    foreach ($file in $criticalFiles) {
        $path = Join-Path $rootDir $file
        if (Test-Path $path) {
            Write-Host "  ✓ $file" -ForegroundColor Green
        } else {
            Write-Error "Missing critical file: $file"
            $allPresent = $false
        }
    }

    if ($allPresent) {
        Write-Success "All critical files present"
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  CLEANUP SUMMARY" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Mode: $Mode" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Dry Run: Yes (no changes made)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Items removed: $script:CleanupCount" -ForegroundColor $(if ($script:CleanupCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Items moved: $script:MovedCount" -ForegroundColor $(if ($script:MovedCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Space freed: $(Format-FileSize $script:SpaceFreed)" -ForegroundColor $(if ($script:SpaceFreed -gt 0) { "Green" } else { "Gray" })

if ($script:Errors.Count -gt 0) {
    Write-Host "`nErrors: $($script:Errors.Count)" -ForegroundColor Red
    foreach ($err in $script:Errors) {
        Write-Host "  • $err" -ForegroundColor Red
    }
}

Write-Host ""
if ($DryRun) {
    Write-Info "Run without -DryRun to execute cleanup"
    exit 0
} else {
    Write-Success "Workspace cleanup complete!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Review changes: git status"
    Write-Host "  2. Run tests: .\COMMIT_READY.ps1 -Mode quick"
    Write-Host "  3. Commit: git add -A && git commit -m 'chore: workspace cleanup and organization'"
    Write-Host ""
    exit 0
}
