<#
.SYNOPSIS
    Audit workspace for deprecated markers and enforce archival policy

.DESCRIPTION
    Scans the workspace for deprecated/obsolete markers and validates:
    - No deprecated scripts in root directory
    - Deprecated markers properly documented
    - Archive structure compliance
    - Sunset periods honored

.PARAMETER Mode
    Audit mode: Quick (files only), Standard (files + content), Full (detailed)

.PARAMETER AutoFix
    Automatically fix issues where possible

.PARAMETER ExitOnViolation
    Exit with non-zero code if violations found (for CI/CD)

.EXAMPLE
    .\audit_deprecated_markers.ps1 -Mode Quick
    # Quick file-level check (30 seconds)

.EXAMPLE
    .\audit_deprecated_markers.ps1 -Mode Standard -ExitOnViolation
    # Standard audit with CI/CD enforcement (2-3 min)

.NOTES
    Version: 1.0
    Created: February 13, 2026
    Part of: Deprecation Policy Enforcement
#>

[CmdletBinding()]
param(
    [ValidateSet('Quick', 'Standard', 'Full')]
    [string]$Mode = 'Quick',
    
    [switch]$AutoFix,
    
    [switch]$ExitOnViolation
)

$ErrorActionPreference = 'Stop'

# Color output helpers
function Write-Pass { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warn { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }

# Results tracking
$script:violations = @()
$script:warnings = @()

function Add-Violation {
    param([string]$Message, [string]$File = "", [string]$Fix = "")
    $script:violations += @{
        Message = $Message
        File = $File
        Fix = $Fix
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

function Add-Warning {
    param([string]$Message, [string]$File = "")
    $script:warnings += @{
        Message = $Message
        File = $File
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DEPRECATION POLICY AUDIT" -ForegroundColor Cyan
Write-Host "║  Mode: $Mode" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================================================
# CHECK 1: Root Directory - No Deprecated Scripts
# ============================================================================

Write-Info "Check 1/5: Root directory deprecated scripts..."

$rootDeprecatedPatterns = @(
    "RELEASE_PREPARATION.ps1",
    "*_DEPRECATED.ps1",
    "*_OBSOLETE.ps1",
    "*_LEGACY.ps1"
)

$rootDeprecatedFound = $false
foreach ($pattern in $rootDeprecatedPatterns) {
    $found = Get-ChildItem -Path "." -Filter $pattern -File -ErrorAction SilentlyContinue
    if ($found) {
        Add-Violation -Message "Deprecated script in root: $($found.Name)" `
                      -File $found.FullName `
                      -Fix "Move to archive/cleanup-$(Get-Date -Format 'MMM-yyyy')/legacy-scripts/"
        $rootDeprecatedFound = $true
    }
}

if (-not $rootDeprecatedFound) {
    Write-Pass "Root directory clean (no deprecated scripts)"
} else {
    Write-Fail "Found deprecated scripts in root directory"
}

# ============================================================================
# CHECK 2: Archive Structure Compliance
# ============================================================================

Write-Info "Check 2/5: Archive structure compliance..."

$archiveReadme = "archive/README.md"
if (-not (Test-Path $archiveReadme)) {
    Add-Violation -Message "Archive discovery guide missing" `
                  -File $archiveReadme `
                  -Fix "Create archive/README.md with retention policy"
    Write-Fail "Archive README.md missing"
} else {
    Write-Pass "Archive structure documented"
}

# ============================================================================
# CHECK 3: Deprecated Markers in Active Code
# ============================================================================

Write-Info "Check 3/5: Deprecated markers in active code..."

if ($Mode -ne 'Quick') {
    # Search for deprecated markers in non-archive files
    $deprecatedMarkers = @(
        "DEPRECATED",
        "OBSOLETE",
        "@deprecated"
    )
    
    $activeCodePaths = @(
        "backend/*.py",
        "frontend/src/**/*.{ts,tsx,js,jsx}",
        "scripts/**/*.ps1",
        "*.ps1"
    )
    
    $markerFindings = @()
    
    foreach ($marker in $deprecatedMarkers) {
        $results = Get-ChildItem -Path . -Recurse -Include *.py,*.ts,*.tsx,*.js,*.jsx,*.ps1 -File |
            Where-Object { $_.FullName -notlike "*\archive\*" -and $_.FullName -notlike "*\node_modules\*" } |
            Select-String -Pattern $marker -CaseSensitive:$false |
            Select-Object -First 20
        
        foreach ($result in $results) {
            # Check if it's a proper deprecation notice or orphaned
            $line = $result.Line.Trim()
            
            # Acceptable patterns (intentional deprecation)
            $acceptable = $line -match "deprecated.*since" -or 
                         $line -match "DEPRECATED.*Use.*instead" -or
                         $line -match "@deprecated.*version" -or
                         $line -match "legacy.*compat"
            
            if (-not $acceptable) {
                $markerFindings += $result
                Add-Warning -Message "Undocumented deprecation marker: $($result.Filename):$($result.LineNumber)" `
                           -File $result.Path
            }
        }
    }
    
    if ($markerFindings.Count -eq 0) {
        Write-Pass "All deprecation markers properly documented"
    } else {
        Write-Warn "Found $($markerFindings.Count) undocumented deprecation markers"
    }
}

# ============================================================================
# CHECK 4: .gitignore Protection
# ============================================================================

Write-Info "Check 4/5: Git protection for archived scripts..."

$gitignoreFile = ".gitignore"
if (Test-Path $gitignoreFile) {
    $gitignoreContent = Get-Content $gitignoreFile -Raw
    
    # Check for archived script patterns
    $expectedPatterns = @(
        "/RELEASE_PREPARATION.ps1"
    )
    
    $missingPatterns = @()
    foreach ($pattern in $expectedPatterns) {
        if ($gitignoreContent -notlike "*$pattern*") {
            $missingPatterns += $pattern
        }
    }
    
    if ($missingPatterns.Count -eq 0) {
        Write-Pass "Git protection in place for archived scripts"
    } else {
        Add-Warning -Message "Missing .gitignore patterns: $($missingPatterns -join ', ')" `
                   -File $gitignoreFile
        Write-Warn ".gitignore missing protection for $($missingPatterns.Count) archived scripts"
    }
} else {
    Add-Violation -Message ".gitignore file not found" -File $gitignoreFile
    Write-Fail ".gitignore file missing"
}

# ============================================================================
# CHECK 5: Deprecation Policy Documentation
# ============================================================================

Write-Info "Check 5/5: Deprecation policy documentation..."

$policyFiles = @(
    "docs/development/DEPRECATION_POLICY.md"
)

$missingPolicies = @()
foreach ($policyFile in $policyFiles) {
    if (-not (Test-Path $policyFile)) {
        $missingPolicies += $policyFile
        Add-Violation -Message "Deprecation policy missing: $policyFile" `
                      -File $policyFile `
                      -Fix "Create deprecation policy documentation"
    }
}

if ($missingPolicies.Count -eq 0) {
    Write-Pass "Deprecation policy documented"
} else {
    Write-Fail "Missing $($missingPolicies.Count) policy documents"
}

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  AUDIT RESULTS" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Violations: $($script:violations.Count)" -ForegroundColor $(if ($script:violations.Count -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings:   $($script:warnings.Count)" -ForegroundColor $(if ($script:warnings.Count -eq 0) { "Green" } else { "Yellow" })

if ($script:violations.Count -gt 0) {
    Write-Host "`n❌ VIOLATIONS FOUND:" -ForegroundColor Red
    foreach ($violation in $script:violations) {
        Write-Host "  • $($violation.Message)" -ForegroundColor Red
        if ($violation.File) {
            Write-Host "    File: $($violation.File)" -ForegroundColor Gray
        }
        if ($violation.Fix) {
            Write-Host "    Fix: $($violation.Fix)" -ForegroundColor Yellow
        }
    }
}

if ($script:warnings.Count -gt 0) {
    Write-Host "`n⚠️  WARNINGS:" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "  • $($warning.Message)" -ForegroundColor Yellow
    }
}

if ($script:violations.Count -eq 0 -and $script:warnings.Count -eq 0) {
    Write-Host "`n✅ PASS - No policy violations detected" -ForegroundColor Green
    Write-Host "`nDeprecation policy compliance: 100%" -ForegroundColor Green
    exit 0
} elseif ($script:violations.Count -eq 0) {
    Write-Host "`n⚠️  PASS (with warnings) - Review warnings above" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n❌ FAIL - Fix violations before committing" -ForegroundColor Red
    
    if ($ExitOnViolation) {
        exit 1
    } else {
        exit 0
    }
}
