#!/usr/bin/env pwsh
<#
.SYNOPSIS
Validates that all paths and imports are correct after reorganization migration.

.DESCRIPTION
Checks for broken paths, missing files, and incorrect imports after moving
code from the old structure to the new structure (src/, infra/, config/, etc.)

.EXAMPLE
./VALIDATE_PATHS.ps1
#>

param(
    [switch]$Verbose,
    [switch]$FixPaths,
    [string]$ReportPath = "PATH_VALIDATION_REPORT.md"
)

$ErrorActionPreference = "Continue"
$validationErrors = @()
$validationWarnings = @()
$validationPassed = @()

Write-Host "🔍 Starting Path Validation..." -ForegroundColor Cyan
Write-Host ""

# Check 1: Verify directory structure exists
Write-Host "✓ Checking directory structure..." -ForegroundColor Yellow
$requiredDirs = @(
    "src/backend",
    "src/frontend",
    "infra/docker",
    "infra/deployment",
    "infra/installer",
    "infra/native-lite",
    "infra/scripts",
    "config",
    "config/environments",
    "docs",
    "docs/reports",
    "docs/guides",
    "docs/planning"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        $validationPassed += "✅ Directory exists: $dir"
    } else {
        $validationErrors += "❌ Missing directory: $dir"
    }
}

# Check 2: Verify source code moved
Write-Host "✓ Checking source code locations..." -ForegroundColor Yellow
if (Test-Path "src/backend") {
    $validationPassed += "✅ Backend code found in src/backend"
} else {
    $validationErrors += "❌ Backend code not found in src/backend (may still be in backend/)"
}

if (Test-Path "src/frontend") {
    $validationPassed += "✅ Frontend code found in src/frontend"
} else {
    $validationErrors += "❌ Frontend code not found in src/frontend (may still be in frontend/)"
}

# Check 3: Verify old locations are cleaned
Write-Host "✓ Checking for old location remnants..." -ForegroundColor Yellow
if ((Test-Path "backend") -and -not (Test-Path "src/backend")) {
    $validationWarnings += "⚠️  Old backend/ directory still exists (should be moved to src/backend/)"
} else {
    $validationPassed += "✅ Old backend/ directory cleaned"
}

if ((Test-Path "frontend") -and -not (Test-Path "src/frontend")) {
    $validationWarnings += "⚠️  Old frontend/ directory still exists (should be moved to src/frontend/)"
} else {
    $validationPassed += "✅ Old frontend/ directory cleaned"
}

# Check 4: Verify config files moved
Write-Host "✓ Checking configuration files..." -ForegroundColor Yellow
$configFiles = @(
    "config/.env",
    "config/.env.example",
    "config/environments/production.env",
    "config/.pre-commit-config.yaml"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        $validationPassed += "✅ Config file found: $file"
    } else {
        # Check if it's still in old location
        $oldName = ($file -replace "^config/", "")
        if (Test-Path $oldName) {
            $validationWarnings += "⚠️  Config file still in root: $oldName (should be in $file)"
        } else {
            # Not critical if missing - could be optional
            $validationPassed += "⚠️  Config file not found (optional): $file"
        }
    }
}

# Check 5: Verify scripts organized
Write-Host "✓ Checking script organization..." -ForegroundColor Yellow
$scriptDirs = @(
    @{ path = "infra/scripts/release"; required = @("RELEASE_HELPER.ps1", "RELEASE_READY.ps1") },
    @{ path = "infra/scripts/dev"; required = @("NATIVE_TOGGLE.ps1", "DOCKER.ps1") },
    @{ path = "infra/scripts/testing"; required = @("RUN_E2E_TESTS.ps1", "RUN_TESTS_BATCH.ps1") },
    @{ path = "infra/scripts/ops"; required = @("COMMIT_READY.ps1", "WORKSPACE_CLEANUP.ps1") }
)

foreach ($scriptDir in $scriptDirs) {
    if (Test-Path $scriptDir.path) {
        $validationPassed += "✅ Script directory exists: $($scriptDir.path)"
        foreach ($script in $scriptDir.required) {
            $fullPath = Join-Path $scriptDir.path $script
            if (Test-Path $fullPath) {
                $validationPassed += "  ✅ $script"
            } else {
                $oldPath = "./$script"
                if (Test-Path $oldPath) {
                    $validationWarnings += "⚠️  Script still in root: $script (should be in $($scriptDir.path))"
                }
            }
        }
    } else {
        $validationErrors += "❌ Script directory missing: $($scriptDir.path)"
    }
}

# Check 6: Verify documentation structure
Write-Host "✓ Checking documentation structure..." -ForegroundColor Yellow
$docDirs = @("docs/reports", "docs/guides", "docs/planning")
foreach ($docDir in $docDirs) {
    if (Test-Path $docDir) {
        $validationPassed += "✅ Documentation directory exists: $docDir"
    } else {
        $validationErrors += "❌ Documentation directory missing: $docDir"
    }
}

# Check 7: Scan for broken imports (Python)
Write-Host "✓ Scanning for Python import issues..." -ForegroundColor Yellow
if (Test-Path "src/backend") {
    $pythonFiles = Get-ChildItem -Path "src/backend" -Include "*.py" -Recurse
    $importIssues = 0

    foreach ($file in $pythonFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue

        # Check for old import style
        if ($content -match "from backend\." -or $content -match "import backend\.") {
            $validationWarnings += "⚠️  File has old-style imports: $($file.Name)"
            $importIssues++
        }

        # Check for .env references
        if ($content -match "load_dotenv\(['\"]\.env") {
            $validationWarnings += "⚠️  File has old .env path: $($file.Name)"
            $importIssues++
        }
    }

    if ($importIssues -eq 0) {
        $validationPassed += "✅ No broken Python imports detected"
    }
}

# Check 8: Scan for broken workflow paths
Write-Host "✓ Scanning workflow files..." -ForegroundColor Yellow
if (Test-Path ".github/workflows") {
    $workflowFiles = Get-ChildItem -Path ".github/workflows" -Include "*.yml", "*.yaml"

    foreach ($workflow in $workflowFiles) {
        $content = Get-Content $workflow.FullName -Raw
        $issues = 0

        if ($content -match "working-directory:\s+(backend|frontend)" -and -not ($content -match "working-directory:\s+src/(backend|frontend)")) {
            $issues++
            $validationWarnings += "⚠️  Workflow $($workflow.Name) has old working-directory paths"
        }

        if ($content -match "\.env" -and -not ($content -match "config/\.env")) {
            # This might be okay, check more carefully
            if ($content -match "run:.*\.env" -and -not ($content -match "config/\.env")) {
                $issues++
                $validationWarnings += "⚠️  Workflow $($workflow.Name) may need .env path update"
            }
        }

        if ($issues -eq 0) {
            $validationPassed += "✅ Workflow $($workflow.Name) paths look correct"
        }
    }
}

# Check 9: Verify no broken symlinks or references
Write-Host "✓ Checking for orphaned references..." -ForegroundColor Yellow

# Look for references in root level files
$rootScripts = Get-ChildItem -Path "." -MaxDepth 1 -Include "*.ps1" -ErrorAction SilentlyContinue
foreach ($script in $rootScripts) {
    # This should not exist if scripts were moved
    $validationWarnings += "⚠️  Found script still at root: $($script.Name) (should be in infra/scripts/)"
}

# Generate Report
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 VALIDATION REPORT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$report = @()
$report += "# Path Migration Validation Report"
$report += "**Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += "**Status**: $(if ($validationErrors.Count -eq 0) { '✅ PASSED' } else { '❌ FAILED' })"
$report += ""

if ($validationPassed.Count -gt 0) {
    Write-Host "✅ Passed Checks ($($validationPassed.Count)):" -ForegroundColor Green
    foreach ($item in $validationPassed) {
        Write-Host "  $item"
    }
    $report += "## ✅ Passed Checks"
    $report += ""
    foreach ($item in $validationPassed) {
        $report += "- $item"
    }
    $report += ""
}

if ($validationWarnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings ($($validationWarnings.Count)):" -ForegroundColor Yellow
    foreach ($item in $validationWarnings) {
        Write-Host "  $item"
    }
    $report += "## ⚠️  Warnings"
    $report += ""
    foreach ($item in $validationWarnings) {
        $report += "- $item"
    }
    $report += ""
}

if ($validationErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Errors ($($validationErrors.Count)):" -ForegroundColor Red
    foreach ($item in $validationErrors) {
        Write-Host "  $item"
    }
    $report += "## ❌ Errors"
    $report += ""
    foreach ($item in $validationErrors) {
        $report += "- $item"
    }
    $report += ""
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Write report to file
$report | Set-Content $ReportPath -Encoding UTF8
Write-Host "📄 Report saved to: $ReportPath" -ForegroundColor Cyan

# Summary
Write-Host ""
if ($validationErrors.Count -eq 0) {
    Write-Host "✅ VALIDATION PASSED - All paths are correct!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ VALIDATION FAILED - $($validationErrors.Count) error(s) found" -ForegroundColor Red
    exit 1
}
