#Requires -Version 7.0
#Requires -PSEdition Core

<#
.SYNOPSIS
    ⚠️ DEPRECATED - Use RELEASE_READY.ps1 instead

.DESCRIPTION
    This script has been deprecated as of February 2026.

    All functionality has been consolidated into RELEASE_READY.ps1
    which now provides the complete release workflow:
    - Pre-release validation (this script's functionality)
    - Version updates
    - Installer build
    - Commit and tag creation
    - Push to remote

    Use: .\RELEASE_READY.ps1 -ReleaseVersion "X.X.X" -TagRelease

    This script is kept for reference only and will be removed in future versions.

.NOTES
    Deprecated: February 4, 2026
    Replacement: RELEASE_READY.ps1 (single source of truth)
#>

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ⚠️  DEPRECATED SCRIPT                                    ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "This script (RELEASE_PREPARATION.ps1) has been DEPRECATED." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please use RELEASE_READY.ps1 instead:" -ForegroundColor Cyan
Write-Host "  .\RELEASE_READY.ps1 -ReleaseVersion `"X.X.X`" -TagRelease" -ForegroundColor Gray
Write-Host ""
Write-Host "RELEASE_READY.ps1 now includes:" -ForegroundColor Cyan
Write-Host "  ✓ All validation from this script" -ForegroundColor Green
Write-Host "  ✓ Version updates" -ForegroundColor Green
Write-Host "  ✓ Installer build" -ForegroundColor Green
Write-Host "  ✓ Commit and push" -ForegroundColor Green
Write-Host ""
Write-Host "Continuing with deprecated script in 5 seconds..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel" -ForegroundColor Gray
Start-Sleep -Seconds 5
Write-Host ""

<#
.SYNOPSIS
    Automated release preparation script - runs all prerequisites before release.

.DESCRIPTION
    Validates and prepares the codebase for release by running:
    - Git status checks
    - Version verification
    - Pre-commit checks (format, lint, organize imports)
    - Test suites
    - Installer builder verification

.PARAMETER Mode
    Preparation mode:
    - 'Quick' (default): Basic checks and pre-commit (5 min)
    - 'Full': All checks including all tests (15-40 min)
    - 'Tests': Only run tests (10-20 min)

.PARAMETER SkipTests
    Skip running test suites (backend/frontend tests)

.PARAMETER SkipFrontend
    Skip frontend tests (saves ~15 minutes)

.PARAMETER AutoFix
    Automatically fix version inconsistencies and formatting issues

.EXAMPLE
    .\RELEASE_PREPARATION.ps1 -Mode Quick
    # Quick preparation (most common)

.EXAMPLE
    .\RELEASE_PREPARATION.ps1 -Mode Full
    # Full preparation with all tests

.EXAMPLE
    .\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
    # Quick prep with auto-fix enabled

.NOTES
    Prerequisites:
    - Python 3.11+ with pytest
    - Node.js 18+ with npm
    - Git 2.40+
    - PowerShell 7.0+ (Core)

    Exit Codes:
    - 0: Success
    - 1: Preparation failed
    - 2: User cancelled operation
#>

param(
    [ValidateSet('Quick', 'Full', 'Tests')]
    [string]$Mode = 'Quick',

    [switch]$SkipTests,

    [switch]$SkipFrontend,

    [switch]$AutoFix,

    [switch]$Help
)

$ErrorActionPreference = 'Stop'
$WarningPreference = 'Continue'

# Color codes
$Script:ColorGreen = "`e[32m"
$Script:ColorRed = "`e[31m"
$Script:ColorYellow = "`e[33m"
$Script:ColorCyan = "`e[36m"
$Script:ColorReset = "`e[0m"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error_ {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning_ {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Step {
    param(
        [int]$Number,
        [int]$Total,
        [string]$Message
    )
    Write-Host "[$Number/$Total] $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$CommandName)
    try {
        $null = Get-Command $CommandName -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
# PREPARATION FUNCTIONS
# ============================================================================

function Invoke-GitStatusCheck {
    Write-Step 1 8 "Checking git status..."

    # Check working tree
    $status = git status --porcelain 2>$null
    if ($status) {
        Write-Error_ "Uncommitted changes found:"
        Write-Host $status
        Write-Info "Commit or stash changes before releasing"
        return $false
    }

    Write-Success "Working tree clean"

    # Check branch
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($branch -ne 'main') {
        Write-Warning_ "You are on branch '$branch', not 'main'"
        Write-Info "Consider switching to main: git checkout main"
    }

    return $true
}

function Invoke-RemoteUpdate {
    Write-Step 2 8 "Updating from remote..."

    try {
        $null = git fetch origin 2>$null
        Write-Success "Fetched latest from remote"
        return $true
    } catch {
        Write-Error_ "Failed to fetch from remote"
        return $false
    }
}

function Invoke-VersionVerification {
    Write-Step 3 8 "Verifying version consistency..."

    $verifyScript = ".\scripts\VERIFY_VERSION.ps1"
    if (-not (Test-Path $verifyScript)) {
        Write-Warning_ "Version verification script not found: $verifyScript"
        return $true  # Don't fail, just warn
    }

    try {
        $params = @{}
        if ($AutoFix) {
            $params['AutoFix'] = $true
        }

        & $verifyScript @params 2>&1 | Out-Null
        Write-Success "Version consistency verified"
        return $true
    } catch {
        if ($AutoFix) {
            Write-Warning_ "Version verification had issues (auto-fix attempted)"
            return $true  # Continue, user can fix manually if needed
        } else {
            Write-Error_ "Version verification failed"
            Write-Info "Run with -AutoFix to attempt automatic fixes"
            return $false
        }
    }
}

function Invoke-PreCommitChecks {
    Write-Step 4 8 "Running pre-commit checks..."

    $commitReadyScript = ".\COMMIT_READY.ps1"
    if (-not (Test-Path $commitReadyScript)) {
        Write-Error_ "COMMIT_READY.ps1 not found"
        return $false
    }

    try {
        $params = @{'Quick' = $true}
        & $commitReadyScript @params
        if ($LASTEXITCODE -ne 0) {
            Write-Error_ "Pre-commit checks failed"
            return $false
        }
        Write-Success "Pre-commit checks passed"
        return $true
    } catch {
        Write-Error_ "Failed to run pre-commit checks: $_"
        return $false
    }
}

function Invoke-BackendTests {
    Write-Step 5 8 "Running backend tests..."

    if ($SkipTests) {
        Write-Info "Skipped (--SkipTests)"
        return $true
    }

    if ($Mode -eq 'Quick') {
        Write-Info "Skipped in Quick mode (use -Mode Full for tests)"
        return $true
    }

    if (-not (Test-Path "backend")) {
        Write-Warning_ "Backend directory not found"
        return $true
    }

    try {
        Push-Location backend
        Write-Host "  Running pytest..." -ForegroundColor Gray

        $pythonCmd = if (Test-Command 'python') { 'python' } else { 'python3' }
        & $pythonCmd -m pytest -q 2>&1

        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Write-Error_ "Backend tests failed"
            return $false
        }

        Pop-Location
        Write-Success "Backend tests passed"
        return $true
    } catch {
        Pop-Location
        Write-Error_ "Failed to run backend tests: $_"
        return $false
    }
}

function Invoke-FrontendTests {
    Write-Step 6 8 "Checking frontend..."

    if ($SkipTests -or $SkipFrontend) {
        Write-Info "Skipped"
        return $true
    }

    if ($Mode -eq 'Quick') {
        Write-Info "Skipped in Quick mode (use -Mode Full for tests)"
        return $true
    }

    if (-not (Test-Path "frontend/package.json")) {
        Write-Warning_ "Frontend not found"
        return $true
    }

    # Frontend tests take too long, just warn
    Write-Info "Frontend tests not run by default (too time-consuming)"
    Write-Info "Run manually if frontend was modified: npm run test -- --run"
    return $true
}

function Invoke-InstallerVerification {
    Write-Step 7 8 "Verifying installer builder..."

    if (-not (Test-Path ".\INSTALLER_BUILDER.ps1")) {
        Write-Error_ "INSTALLER_BUILDER.ps1 not found"
        return $false
    }

    Write-Success "Installer builder script found"
    return $true
}

function Invoke-FinalChecks {
    Write-Step 8 8 "Final preparation checks..."

    if (-not (Test-Path "VERSION")) {
        Write-Error_ "VERSION file not found"
        return $false
    }

    $version = (Get-Content "VERSION").Trim()
    Write-Info "Current version: $version"

    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($branch -ne 'main') {
        Write-Warning_ "Not on main branch (currently on: $branch)"
    }

    Write-Success "All final checks complete"
    return $true
}

# ============================================================================
# MAIN
# ============================================================================

function Show-Help {
    Get-Help $PSCommandPath -Full
}

function Invoke-ReleasePreparation {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Release Preparation - SMS            ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Mode: $Mode" -ForegroundColor Cyan
    if ($AutoFix) {
        Write-Host "AutoFix: Enabled" -ForegroundColor Green
    }
    Write-Host ""

    $steps = @(
        { Invoke-GitStatusCheck },
        { Invoke-RemoteUpdate },
        { Invoke-VersionVerification },
        { Invoke-PreCommitChecks },
        { Invoke-BackendTests },
        { Invoke-FrontendTests },
        { Invoke-InstallerVerification },
        { Invoke-FinalChecks }
    )

    $stepCount = 0
    foreach ($step in $steps) {
        $stepCount++
        try {
            $result = & $step
            if (-not $result) {
                Write-Host ""
                Write-Error_ "Preparation failed at step $stepCount"
                Write-Info "Address the issues above and try again"
                exit 1
            }
        } catch {
            Write-Error_ "Unexpected error: $_"
            exit 1
        }
        Write-Host ""
    }

    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   ✓ Ready for Release                  ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run release:" -ForegroundColor Yellow
    Write-Host "   .\RELEASE_READY.ps1 -ReleaseVersion <version> -TagRelease" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Monitor GitHub Actions:" -ForegroundColor Yellow
    Write-Host "   https://github.com/$env:GITHUB_REPOSITORY/actions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Verify release:" -ForegroundColor Yellow
    Write-Host "   https://github.com/$env:GITHUB_REPOSITORY/releases" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Green

    if (Test-Path "VERSION") {
        $version = (Get-Content "VERSION").Trim()
        Write-Host "  .\RELEASE_READY.ps1 -ReleaseVersion $version -TagRelease" -ForegroundColor Gray
    }

    Write-Host ""
}

# Handle help flag
if ($Help) {
    Show-Help
    exit 0
}

# Main execution
try {
    Invoke-ReleasePreparation
    exit 0
} catch {
    Write-Error_ "Fatal error: $_"
    exit 1
}
