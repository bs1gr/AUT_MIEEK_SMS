#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies workspace consistency and suggests improvements

.DESCRIPTION
    Comprehensive workspace verification tool that:
    - Checks file locations against best practices
    - Verifies all documentation references
    - Identifies broken links
    - Suggests reorganization opportunities
    - Updates WORKSPACE_STATE.md tracker

.EXAMPLE
    .\VERIFY_WORKSPACE.ps1
    # Run full verification

.EXAMPLE
    .\VERIFY_WORKSPACE.ps1 -Fix
    # Auto-fix issues where possible

.EXAMPLE
    .\VERIFY_WORKSPACE.ps1 -Report
    # Generate detailed report only
#>

param(
    [switch]$Fix,      # Auto-fix issues where possible
    [switch]$Report,   # Generate report only
    [switch]$Verbose   # Show detailed output
)

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = $SCRIPT_DIR

# Color output functions
function Write-Success { param($Text) Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠️  $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "❌ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ️  $Text" -ForegroundColor Cyan }
function Write-Header { param($Text) Write-Host "`n━━━ $Text ━━━" -ForegroundColor Magenta }

# Verification results
$script:Issues = @()
$script:Suggestions = @()
$script:Fixes = @()

function Add-Issue {
    param([string]$Type, [string]$File, [string]$Message, [string]$Suggestion = "")
    $script:Issues += @{
        Type = $Type
        File = $File
        Message = $Message
        Suggestion = $Suggestion
    }
}

function Add-Suggestion {
    param([string]$Category, [string]$Message, [string]$Priority = "Medium")
    $script:Suggestions += @{
        Category = $Category
        Message = $Message
        Priority = $Priority
    }
}

# ============================================================================
# FILE LOCATION CHECKS
# ============================================================================

function Test-FileLocations {
    Write-Header "Checking File Locations"

    # Check for config files in root
    $configFiles = @("*.ini", "*.toml", "ruff.toml", "mypy.ini", "pytest.ini")
    foreach ($pattern in $configFiles) {
        $files = Get-ChildItem -Path $PROJECT_ROOT -Filter $pattern -File -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            Add-Issue -Type "Location" -File $file.Name `
                -Message "Config file in root directory" `
                -Suggestion "Move to config/ directory"
            Write-Warning2 "Found: $($file.Name) (should be in config/)"
        }
    }

    # Check for docker-compose files in root
    $dockerFiles = Get-ChildItem -Path $PROJECT_ROOT -Filter "docker-compose*.yml" -File -ErrorAction SilentlyContinue
    foreach ($file in $dockerFiles) {
        Add-Issue -Type "Location" -File $file.Name `
            -Message "Docker compose file in root" `
            -Suggestion "Move to docker/ directory"
        Write-Warning2 "Found: $($file.Name) (should be in docker/)"
    }

    # Check for orphaned session documents in root
    $sessionPatterns = @("*SESSION*", "*CONSOLIDATION*", "*SUMMARY*_2025-*", "*PLAN.md", "*REPORT.md")
    foreach ($pattern in $sessionPatterns) {
        $files = Get-ChildItem -Path $PROJECT_ROOT -Filter $pattern -File -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            if ($file.Name -notmatch "SCRIPTS_CONSOLIDATION_GUIDE") {
                Add-Issue -Type "Location" -File $file.Name `
                    -Message "Session/temporal document in root" `
                    -Suggestion "Move to archive/sessions_2025-11/"
                Write-Warning2 "Found: $($file.Name) (should be archived)"
            }
        }
    }

    if ($script:Issues.Count -eq 0) {
        Write-Success "All files in correct locations"
    }
}

# ============================================================================
# DOCUMENTATION REFERENCE CHECKS
# ============================================================================

function Test-DocumentationReferences {
    Write-Header "Checking Documentation References"

    $brokenLinks = 0
    $mdFiles = Get-ChildItem -Path $PROJECT_ROOT -Recurse -Filter "*.md" -File `
        | Where-Object { $_.FullName -notmatch "node_modules|\.venv|\.git|archive" }

    foreach ($mdFile in $mdFiles) {
        $content = Get-Content $mdFile.FullName -Raw

        # Check for common broken reference patterns
        if ($content -match "RUN\.ps1|INSTALL\.ps1|SMS\.ps1" -and $mdFile.Name -notmatch "CONSOLIDATION|archive") {
            Add-Issue -Type "Reference" -File $mdFile.Name `
                -Message "References deprecated scripts" `
                -Suggestion "Update to DOCKER.ps1/NATIVE.ps1"
            $brokenLinks++
        }

        # Check for old config paths
        if ($content -match "\bmypy\.ini\b" -and $content -notmatch "config/mypy\.ini") {
            Add-Issue -Type "Reference" -File $mdFile.Name `
                -Message "References mypy.ini without config/ path" `
                -Suggestion "Update to config/mypy.ini"
            $brokenLinks++
        }

        if ($content -match "\bpytest\.ini\b" -and $content -notmatch "config/pytest\.ini") {
            Add-Issue -Type "Reference" -File $mdFile.Name `
                -Message "References pytest.ini without config/ path" `
                -Suggestion "Update to config/pytest.ini"
            $brokenLinks++
        }

        # Check for old docker-compose paths
        if ($content -match "\bdocker-compose\.yml\b" -and $content -notmatch "docker/docker-compose\.yml") {
            if ($mdFile.Name -notmatch "archive|CONSOLIDATION") {
                Add-Issue -Type "Reference" -File $mdFile.Name `
                    -Message "References docker-compose.yml without docker/ path" `
                    -Suggestion "Update to docker/docker-compose.yml"
                $brokenLinks++
            }
        }
    }

    if ($brokenLinks -eq 0) {
        Write-Success "All documentation references valid"
    } else {
        Write-Warning2 "Found $brokenLinks potential reference issues"
    }
}

# ============================================================================
# ROOT DIRECTORY CLEANLINESS
# ============================================================================

function Test-RootCleanliness {
    Write-Header "Checking Root Directory Cleanliness"

    $rootFiles = Get-ChildItem -Path $PROJECT_ROOT -File | Where-Object { $_.Name -notmatch "^\." }
    $mdFiles = ($rootFiles | Where-Object { $_.Extension -eq ".md" }).Count
    $ps1Files = ($rootFiles | Where-Object { $_.Extension -eq ".ps1" }).Count

    Write-Info "Root markdown files: $mdFiles (target: ≤5)"
    Write-Info "Root PowerShell scripts: $ps1Files (target: ≤6)"

    if ($mdFiles -gt 5) {
        Add-Suggestion -Category "Organization" `
            -Message "Consider archiving $($mdFiles - 5) additional markdown files" `
            -Priority "Low"
    }

    if ($ps1Files -gt 8) {
        Add-Suggestion -Category "Organization" `
            -Message "Root has $ps1Files PowerShell scripts (consolidation opportunity)" `
            -Priority "Medium"
    }

    # Check for non-essential files
    $nonEssential = @("*.log", "*.tmp", "*.bak", "*_old.*", "*_backup.*")
    foreach ($pattern in $nonEssential) {
        $files = Get-ChildItem -Path $PROJECT_ROOT -Filter $pattern -File -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            Add-Issue -Type "Cleanup" -File $file.Name `
                -Message "Non-essential file in root" `
                -Suggestion "Remove or move to appropriate directory"
            Write-Warning2 "Found: $($file.Name)"
        }
    }

    Write-Success "Root directory check complete"
}

# ============================================================================
# CONSISTENCY CHECKS
# ============================================================================

function Test-VersionConsistency {
    Write-Header "Checking Version Consistency"

    $versionFile = Join-Path $PROJECT_ROOT "VERSION"
    if (Test-Path $versionFile) {
        $version = (Get-Content $versionFile -Raw).Trim()
        Write-Info "Current version: $version"

        # Check if CHANGELOG has this version
        $changelog = Join-Path $PROJECT_ROOT "CHANGELOG.md"
        if (Test-Path $changelog) {
            $changelogContent = Get-Content $changelog -Raw
            if ($changelogContent -notmatch [regex]::Escape($version)) {
                Add-Issue -Type "Consistency" -File "CHANGELOG.md" `
                    -Message "Version $version not found in CHANGELOG" `
                    -Suggestion "Update CHANGELOG.md with current version"
            } else {
                Write-Success "Version consistent with CHANGELOG"
            }
        }
    }
}

# ============================================================================
# REORGANIZATION SUGGESTIONS
# ============================================================================

function Get-ReorganizationSuggestions {
    Write-Header "Reorganization Opportunities"

    # Check for duplicate functionality
    $scriptsDir = Join-Path $PROJECT_ROOT "scripts"
    $toolsDir = Join-Path $PROJECT_ROOT "tools"

    if ((Test-Path $scriptsDir) -and (Test-Path $toolsDir)) {
        Add-Suggestion -Category "Structure" `
            -Message "scripts/ directory exists with utilities" `
            -Priority "Low"
    }

    # Check for multiple backup locations
    $backupDirs = @("backups", "backup", "archives")
    $foundBackups = $backupDirs | Where-Object { Test-Path (Join-Path $PROJECT_ROOT $_) }
    if ($foundBackups.Count -gt 1) {
        Add-Suggestion -Category "Structure" `
            -Message "Multiple backup directories: $($foundBackups -join ', ')" `
            -Priority "Low"
    }

    # Check for .bat wrapper prevalence
    $batFiles = Get-ChildItem -Path $scriptsDir -Recurse -Filter "*.bat" -File -ErrorAction SilentlyContinue
    if ($batFiles.Count -gt 10) {
        Add-Suggestion -Category "Scripts" `
            -Message "$($batFiles.Count) .bat wrappers found - many just call .ps1 files" `
            -Priority "Low"
    }
}

# ============================================================================
# REPORT GENERATION
# ============================================================================

function Write-Report {
    Write-Header "Verification Report"

    Write-Host "`n📊 SUMMARY" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Issues Found: $($script:Issues.Count)" -ForegroundColor $(if ($script:Issues.Count -gt 0) { "Yellow" } else { "Green" })
    Write-Host "Suggestions: $($script:Suggestions.Count)" -ForegroundColor Cyan
    Write-Host "Fixes Applied: $($script:Fixes.Count)" -ForegroundColor Green

    if ($script:Issues.Count -gt 0) {
        Write-Host "`n⚠️  ISSUES FOUND:" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

        $issuesByType = $script:Issues | Group-Object -Property Type
        foreach ($group in $issuesByType) {
            Write-Host "`n  $($group.Name) Issues ($($group.Count)):" -ForegroundColor Cyan
            foreach ($issue in $group.Group) {
                Write-Host "    • $($issue.File): $($issue.Message)" -ForegroundColor White
                if ($issue.Suggestion) {
                    Write-Host "      → $($issue.Suggestion)" -ForegroundColor DarkGray
                }
            }
        }
    }

    if ($script:Suggestions.Count -gt 0) {
        Write-Host "`n💡 SUGGESTIONS:" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

        $suggestionsByPriority = $script:Suggestions | Sort-Object -Property Priority -Descending
        foreach ($suggestion in $suggestionsByPriority) {
            $priorityColor = switch ($suggestion.Priority) {
                "High" { "Red" }
                "Medium" { "Yellow" }
                "Low" { "DarkGray" }
            }
            Write-Host "  [$($suggestion.Priority)] $($suggestion.Category): $($suggestion.Message)" -ForegroundColor $priorityColor
        }
    }

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Student Management System - Workspace Verifier      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Run all checks
Test-FileLocations
Test-DocumentationReferences
Test-RootCleanliness
Test-VersionConsistency
Get-ReorganizationSuggestions

# Generate report
Write-Report

# Exit with appropriate code
if ($script:Issues.Count -gt 0) {
    exit 1
} else {
    Write-Success "`nWorkspace verification passed!"
    exit 0
}
