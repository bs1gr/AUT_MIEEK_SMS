<#
.SYNOPSIS
    Automated version verification and update script for SMS releases.

.DESCRIPTION
    This script verifies and optionally updates all version references across the codebase
    to ensure consistency. It checks VERSION file, documentation, package files, and scripts.

.PARAMETER Version
    Target version to verify/update (e.g., "1.8.8"). If not provided, reads from VERSION file.

.PARAMETER Update
    If specified, automatically updates all version references to the target version.

.PARAMETER Report
    Generate a detailed verification report in VERSION_VERIFICATION_REPORT.md

.PARAMETER CheckOnly
    Only check for inconsistencies without updating (default behavior).

.PARAMETER CIMode
    Fast CI mode - only check VERSION vs frontend package.json (exit code 0=OK, 1=mismatch).

.EXAMPLE
    .\scripts\VERIFY_VERSION.ps1
    Check if all version references match the VERSION file.

.EXAMPLE
    .\scripts\VERIFY_VERSION.ps1 -CIMode
    Quick check for CI pipelines (VERSION vs package.json only).

.EXAMPLE
    .\scripts\VERIFY_VERSION.ps1 -Version "1.8.9" -Update
    Update all version references to 1.8.9.

.EXAMPLE
    .\scripts\VERIFY_VERSION.ps1 -Report
    Generate detailed verification report.

.NOTES
    Author: GitHub Copilot
    Version: 1.0.0
    Created: 2025-11-24
#>

param(
    [Parameter()][string]$Version,
    [Parameter()][switch]$Update,
    [Parameter()][switch]$Report,
    [Parameter()][switch]$CheckOnly,
    [Parameter()][switch]$CIMode
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

# Color output helpers
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error-Message { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }

# ============================================================================
# CI MODE - Fast VERSION ↔ package.json validation only
# ============================================================================
if ($CIMode) {
    $VERSION_FILE = Join-Path $PROJECT_ROOT 'VERSION'
    $FRONTEND_PKG = Join-Path $PROJECT_ROOT 'frontend\package.json'

    if (-not (Test-Path $VERSION_FILE) -or -not (Test-Path $FRONTEND_PKG)) {
        Write-Error-Message "Missing VERSION or frontend/package.json"
        exit 1
    }

    $versionFile = (Get-Content $VERSION_FILE -Raw).Trim()
    $pkg = Get-Content $FRONTEND_PKG -Raw | ConvertFrom-Json
    $versionPkg = $pkg.version

    Write-Host "VERSION file: $versionFile"
    Write-Host "package.json: $versionPkg"

    if ($versionFile -ne $versionPkg) {
        Write-Error-Message "Version mismatch: VERSION ($versionFile) != package.json ($versionPkg)"
        exit 1
    }

    Write-Success "Version consistency OK (CI mode)"
    exit 0
}

# ============================================================================
# FULL MODE - Comprehensive version verification
# ============================================================================

# Banner
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "SMS Version Verification Tool" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Get target version
if (-not $Version) {
    $versionFile = Join-Path $PROJECT_ROOT "VERSION"
    if (Test-Path $versionFile) {
        $Version = (Get-Content $versionFile -Raw).Trim()
        Write-Info "Using version from VERSION file: $Version"
    } else {
        Write-Error-Message "VERSION file not found and no -Version parameter provided"
        exit 1
    }
}

# Validate version format
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error-Message "Invalid version format: $Version (expected: X.Y.Z)"
    exit 1
}

Write-Info "Target version: $Version"
Write-Info "Mode: $(if($Update) {'UPDATE'} else {'CHECK ONLY'})"

# Define files to check/update
$versionChecks = @(
    @{
        File = "VERSION"
        Pattern = "^.*$"  # Match entire content
        Replace = $Version
        Description = "VERSION file"
        Critical = $true
        ExactMatch = $true  # Special flag for VERSION file
    },
    @{
        File = "backend/main.py"
        Pattern = 'Version:\s*\d+\.\d+\.\d+'
        Replace = "Version: $Version"
        Description = "Backend main.py docstring"
        Critical = $true
    },
    @{
        File = "frontend/package.json"
        Pattern = '"version":\s*"\d+\.\d+\.\d+"'
        Replace = "`"version`": `"$Version`""
        Description = "Frontend package.json"
        Critical = $true
    },
    # NOTE: README now uses generic X.X.X patterns for installer references
    # to avoid version mismatches. The actual versioned files are in GitHub Releases.
    @{
        File = "docs/user/USER_GUIDE_COMPLETE.md"
        Pattern = '\*\*Version:\*\*\s*\d+\.\d+\.\d+'
        Replace = "**Version:** $Version"
        Description = "User guide version"
        Critical = $false
    },
    @{
        File = "docs/development/DEVELOPER_GUIDE_COMPLETE.md"
        Pattern = '\*\*Version:\*\*\s*\d+\.\d+\.\d+'
        Replace = "**Version:** $Version"
        Description = "Developer guide version"
        Critical = $false
    },
    @{
        File = "docs/DOCUMENTATION_INDEX.md"
        Pattern = '\*\*Version\*\*:\s*\d+\.\d+\.\d+'
        Replace = "**Version**: $Version"
        Description = "Documentation index version"
        Critical = $false
    },
    @{
        File = "docs/DOCUMENTATION_INDEX.md"
        Pattern = '\*\*Project Version \(documented\)\*\*:\s*\d+\.\d+\.\d+'
        Replace = "**Project Version (documented)**: $Version"
        Description = "Documentation index documented project version"
        Critical = $false
    },
    @{
        File = "COMMIT_READY.ps1"
        Pattern = 'Version:\s*\d+\.\d+\.\d+'
        Replace = "Version: $Version"
        Description = "COMMIT_READY.ps1 version"
        Critical = $false
    },
    @{
        File = "INSTALLER_BUILDER.ps1"
        Pattern = 'Version:\s*\d+\.\d+\.\d+'
        Replace = "Version: $Version"
        Description = "INSTALLER_BUILDER.ps1 version"
        Critical = $false
    }
)

# Results tracking
$results = @{
    Total = 0
    Consistent = 0
    Inconsistent = 0
    Updated = 0
    Failed = 0
    Errors = @()
}

Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "Checking Version References" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

foreach ($check in $versionChecks) {
    $results.Total++
    $filePath = Join-Path $PROJECT_ROOT $check.File

    if (-not (Test-Path $filePath)) {
        Write-Warning "$($check.Description): File not found - $($check.File)"
        if ($check.Critical) {
            $results.Failed++
            $results.Errors += "Missing critical file: $($check.File)"
        }
        continue
    }

    try {
        $content = Get-Content $filePath -Raw

        # Special handling for VERSION file (exact match)
        if ($check.ExactMatch) {
            $currentVersion = $content.Trim()
            if ($currentVersion -eq $Version) {
                Write-Success "$($check.Description): $currentVersion (correct)"
                $results.Consistent++
            } else {
                if ($Update) {
                    Set-Content -Path $filePath -Value $Version -NoNewline
                    Write-Success "$($check.Description): Updated $currentVersion → $Version"
                    $results.Updated++
                } else {
                    Write-Warning "$($check.Description): $currentVersion (expected: $Version)"
                    $results.Inconsistent++
                }
            }
            continue
        }

        # Check if version matches
        if ($content -match $check.Pattern) {
            $currentMatch = $matches[0]

            # Extract version number from match
            if ($currentMatch -match '\d+\.\d+\.\d+') {
                $currentVersion = $matches[0]

                if ($currentVersion -eq $Version) {
                    Write-Success "$($check.Description): $currentVersion (correct)"
                    $results.Consistent++
                } else {
                    if ($Update) {
                        # Perform update
                        $newContent = $content -replace $check.Pattern, $check.Replace
                        Set-Content -Path $filePath -Value $newContent -NoNewline
                        Write-Success "$($check.Description): Updated $currentVersion → $Version"
                        $results.Updated++
                    } else {
                        Write-Warning "$($check.Description): $currentVersion (expected: $Version)"
                        $results.Inconsistent++
                    }
                }
            } else {
                Write-Warning "$($check.Description): Pattern matched but couldn't extract version"
                $results.Inconsistent++
            }
        } else {
            Write-Warning "$($check.Description): Pattern not found in file"
            if ($check.Critical) {
                $results.Failed++
                $results.Errors += "Critical pattern not found in: $($check.File)"
            }
        }
    } catch {
        Write-Error-Message "$($check.Description): Error - $($_.Exception.Message)"
        $results.Failed++
        $results.Errors += "Error processing $($check.File): $($_.Exception.Message)"
    }
}

# Update frontend package-lock.json if package.json was updated
# NOTE: We only update the root-level version fields, NOT dependency versions
# The lock file has two fields we need:
#   1. "version": "X.Y.Z" at root level (project version)
#   2. "packages" → "" → "version" (also project version)
# All other "version" fields are dependency versions and must NOT be changed
if ($Update) {
    $packageLockPath = Join-Path $PROJECT_ROOT "frontend/package-lock.json"
    if (Test-Path $packageLockPath) {
        try {
            $lockContent = Get-Content $packageLockPath -Raw
            $lockJson = $lockContent | ConvertFrom-Json -Depth 100

            # Update only the root-level version
            $lockJson.version = $Version

            # Update the packages."" version (represents the project itself)
            if ($lockJson.packages -and $lockJson.packages.PSObject.Properties['']) {
                $lockJson.packages.''.version = $Version
            }

            # Convert back to JSON with proper formatting
            $updatedContent = $lockJson | ConvertTo-Json -Depth 100
            Set-Content -Path $packageLockPath -Value $updatedContent -Encoding UTF8
            Write-Success "Frontend package-lock.json: Updated project version to $Version (dependencies unchanged)"
            $results.Updated++
        } catch {
            Write-Warning "Could not update package-lock.json: $($_.Exception.Message)"
            Write-Info "Run 'cd frontend && npm install' to regenerate the lock file"
        }
    }
}

# Summary
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

Write-Host "Total checks:       $($results.Total)" -ForegroundColor White
Write-Host "Consistent:         $($results.Consistent)" -ForegroundColor Green
Write-Host "Inconsistent:       $($results.Inconsistent)" -ForegroundColor $(if($results.Inconsistent -gt 0){'Yellow'}else{'Green'})
Write-Host "Updated:            $($results.Updated)" -ForegroundColor $(if($results.Updated -gt 0){'Green'}else{'Gray'})
Write-Host "Failed:             $($results.Failed)" -ForegroundColor $(if($results.Failed -gt 0){'Red'}else{'Green'})

if ($results.Errors.Count -gt 0) {
    Write-Host "`nErrors encountered:" -ForegroundColor Red
    foreach ($error in $results.Errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
}

# Generate report if requested
if ($Report) {
    Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
    Write-Host "Generating Verification Report" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan

    $reportPath = Join-Path $PROJECT_ROOT "VERSION_VERIFICATION_REPORT.md"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    $reportContent = @"
# Version Verification Report

**Date:** $timestamp
**Target Version:** $Version
**Mode:** $(if($Update) {'UPDATE'} else {'CHECK ONLY'})
**Status:** $(if($results.Failed -eq 0 -and $results.Inconsistent -eq 0) {'✅ VERIFIED'} else {'⚠️ ISSUES FOUND'})

---

## Summary

- **Total Checks:** $($results.Total)
- **Consistent:** $($results.Consistent) ✅
- **Inconsistent:** $($results.Inconsistent) $(if($results.Inconsistent -gt 0){'⚠️'}else{'✅'})
- **Updated:** $($results.Updated) $(if($results.Updated -gt 0){'🔄'}else{''})
- **Failed:** $($results.Failed) $(if($results.Failed -gt 0){'❌'}else{'✅'})

---

## Files Checked

"@

    foreach ($check in $versionChecks) {
        $status = if ($check.Critical) {"[CRITICAL]"} else {"[INFO]"}
        $reportContent += "`n- $status $($check.Description): ``$($check.File)``"
    }

    if ($results.Errors.Count -gt 0) {
        $reportContent += "`n`n---`n`n## Errors Encountered`n"
        foreach ($error in $results.Errors) {
            $reportContent += "`n- ❌ $error"
        }
    }

    $reportContent += "`n`n---`n`n## Next Steps`n`n"

    if ($results.Inconsistent -gt 0 -and -not $Update) {
        $reportContent += "Run with ``-Update`` flag to automatically fix inconsistencies:`n``````powershell`n.\scripts\VERIFY_VERSION.ps1 -Version `"$Version`" -Update`n```````n"
    } elseif ($results.Updated -gt 0) {
        $reportContent += "✅ All version references updated successfully.`n`nReady for commit:`n``````powershell`ngit add -A`ngit commit -m `"chore: update version to $Version`"`ngit tag -a v$Version -m `"Release v$Version`"`n```````n"
    } elseif ($results.Consistent -eq $results.Total) {
        $reportContent += "✅ All version references are consistent and up-to-date.`n`nReady for release!`n"
    }

    $reportContent += "`n---`n`n**Generated by:** VERSION_VERIFY.ps1 v1.0.0  `n**Timestamp:** $timestamp`n"

    Set-Content -Path $reportPath -Value $reportContent
    Write-Success "Report generated: VERSION_VERIFICATION_REPORT.md"
}

# Exit with appropriate code
Write-Host ""
if ($results.Failed -gt 0) {
    Write-Error-Message "Verification failed with $($results.Failed) critical errors"
    exit 1
} elseif ($results.Inconsistent -gt 0 -and -not $Update) {
    Write-Warning "Found $($results.Inconsistent) inconsistent version references"
    Write-Info "Run with -Update flag to fix: .\scripts\VERIFY_VERSION.ps1 -Version `"$Version`" -Update"
    exit 2
} else {
    Write-Success "Version verification completed successfully!"
    if ($Update) {
        Write-Info "Updated $($results.Updated) files to version $Version"
    }
    exit 0
}
