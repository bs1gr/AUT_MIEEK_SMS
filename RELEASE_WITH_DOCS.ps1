#Requires -Version 7.0

<#
.SYNOPSIS
    Complete automated release with documentation generation.

.DESCRIPTION
    All-in-one script that runs:
    1. Release preparation (validation)
    2. Documentation generation (release notes, CHANGELOG)
    3. Documentation commit
    4. Release execution (tagging and workflows)

.PARAMETER ReleaseVersion
    Version to release (e.g., "1.13.0"). Required.

.PARAMETER Mode
    Preparation mode: Quick (default) or Full

.PARAMETER SkipTests
    Skip running tests during preparation

.PARAMETER SkipDocCommit
    Skip automatic commit of generated documentation (you'll commit manually)

.PARAMETER Help
    Show help

.EXAMPLE
    .\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0"
    Complete automated release with quick preparation

.EXAMPLE
    .\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0" -Mode Full
    Complete release with full testing

.EXAMPLE
    .\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0" -SkipDocCommit
    Generate docs but review before committing

.NOTES
    Version: 1.1
    This is a convenience wrapper around:
    - RELEASE_READY.ps1 (includes validation from deprecated RELEASE_PREPARATION.ps1)
    - GENERATE_RELEASE_DOCS.ps1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ReleaseVersion,

    [Parameter()]
    [ValidateSet('Quick', 'Full')]
    [string]$Mode = 'Quick',

    [Parameter()]
    [switch]$SkipTests,

    [Parameter()]
    [switch]$SkipDocCommit,

    [Parameter()]
    [switch]$Help
)

# Color output
function Write-PhaseHeader { param([string]$Phase, [string]$Description)
    Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Phase" -ForegroundColor Cyan
    Write-Host "║  $Description" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }

# Show help
if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

# Validate version format
if ($ReleaseVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Invalid version format: $ReleaseVersion (expected: X.Y.Z)"
    exit 1
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  AUTOMATED RELEASE WORKFLOW" -ForegroundColor Green
Write-Host "║  Version: $ReleaseVersion" -ForegroundColor Green
Write-Host "║  Mode: $Mode" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

# PHASE 1: PREPARATION (now handled by RELEASE_READY.ps1)
Write-PhaseHeader "PHASE 1/4: PREPARATION" "Validating codebase is release-ready"

# NOTE: RELEASE_PREPARATION.ps1 deprecated Feb 4, 2026 - validation now in RELEASE_READY.ps1
# Validation happens in PHASE 3 via RELEASE_READY.ps1 -ReleaseVersion
Write-Info "Validation will be performed by RELEASE_READY.ps1 in Phase 3"
Write-Success "Preparation complete"

# PHASE 2: DOCUMENTATION GENERATION
Write-PhaseHeader "PHASE 2/4: DOCUMENTATION" "Generating release notes and updating CHANGELOG"

# Pre-step: Organize documentation folders to avoid duplicates and align structure
Write-Info "Organizing documentation structure before generating release docs..."
try {
    & .\WORKSPACE_CLEANUP.ps1 -Mode standard -SkipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Documentation organization reported non-fatal issues; proceeding with generation."
    } else {
        Write-Info "Documentation organized."
    }
} catch {
    Write-Info "Skipping documentation organization due to error: $_"
}

# Proactively run quick lint/format pass before generating docs to avoid later restarts
Write-Info "Running quick pre-commit validation (AutoFix) before documentation generation..."
try {
    & .\COMMIT_READY.ps1 -Mode quick -SkipTests -AutoFix
} catch {
    Write-Info "Pre-commit quick pass encountered non-fatal issues; proceeding with doc generation. Details: $_"
}

& .\GENERATE_RELEASE_DOCS.ps1 -Version $ReleaseVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "Documentation generation failed."
    exit 1
}
Write-Success "Documentation generated"

# PHASE 3: COMMIT DOCUMENTATION
Write-PhaseHeader "PHASE 3/4: COMMIT DOCS" "Committing generated documentation"

if ($SkipDocCommit) {
    Write-Info "Skipping automatic commit (you specified -SkipDocCommit)"
    Write-Info "Please review and commit manually:"
    Write-Host "  git add CHANGELOG.md docs/releases/"
    Write-Host "  git commit -m 'docs: release notes for v$ReleaseVersion'"
    Write-Host "  git push origin main"
    Write-Host "`nPress Enter when ready to continue with release..."
    Read-Host
} else {
    try {
        # Run a second quick pre-commit validation to normalize newly generated docs
        Write-Info "Validating generated documentation with pre-commit (AutoFix)..."
        try {
            & .\COMMIT_READY.ps1 -Mode quick -SkipTests -AutoFix
        } catch {
            Write-Info "Pre-commit validation returned non-fatal issues; attempting to continue. Details: $_"
        }

        # Check if there are changes to commit
        $status = git status --porcelain 2>$null
        if ($status) {
            git add CHANGELOG.md docs/releases/ ".github/RELEASE_NOTES_v$ReleaseVersion.md" 2>$null
            git commit -m "docs: release notes for v$ReleaseVersion" 2>$null

            Write-Info "Pushing documentation to remote..."
            git push origin main 2>$null

            if ($LASTEXITCODE -ne 0) {
                Write-Error "Git push failed. Check your connection and permissions."
                exit 1
            }
            Write-Success "Documentation committed and pushed"
        } else {
            Write-Info "No documentation changes to commit"
        }
    } catch {
        Write-Error "Failed to commit documentation: $_"
        exit 1
    }
}

# PHASE 4: RELEASE EXECUTION
Write-PhaseHeader "PHASE 4/4: RELEASE" "Creating tag and triggering workflows"

Write-Info "Executing release..."
& .\RELEASE_READY.ps1 -ReleaseVersion $ReleaseVersion -TagRelease

if ($LASTEXITCODE -ne 0) {
    Write-Error "Release execution failed."
    exit 1
}

# SUCCESS SUMMARY
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ RELEASE COMPLETE" -ForegroundColor Green
Write-Host "║" -ForegroundColor Green
Write-Host "║  Version: $ReleaseVersion" -ForegroundColor Green
Write-Host "║  Tag: v$ReleaseVersion" -ForegroundColor Green
Write-Host "║  Documentation: docs/releases/RELEASE_NOTES_v${ReleaseVersion}.md" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Info "Next steps:"
Write-Host "  1. Monitor GitHub Actions: https://github.com/bs1gr/AUT_MIEEK_SMS/actions"
Write-Host "  2. Wait for installer build (~20 minutes)"
Write-Host "  3. Add GitHub release description from:"
Write-Host "     docs/releases/GITHUB_RELEASE_v${ReleaseVersion}.md"
Write-Host "  4. Verify release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v${ReleaseVersion}"
Write-Host ""

exit 0
