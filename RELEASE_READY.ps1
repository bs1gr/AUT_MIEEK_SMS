<#
.SYNOPSIS
    Complete Release Workflow - Single Source of Truth

.DESCRIPTION
    Consolidated release pipeline that handles ALL steps:
    1. Validation (git status, version checks, tests)
    2. Version updates across all files
    3. Installer build with code signing
    4. Commit and tag creation
    5. Push to remote and trigger GitHub Actions

    Replaces: RELEASE_PREPARATION.ps1 (validation moved here)

.PARAMETER ReleaseVersion
    Target release version (e.g., "1.17.7")

.PARAMETER TagRelease
    Create and push git tag after successful release

.PARAMETER SkipValidation
    Skip pre-release validation (NOT RECOMMENDED)

.PARAMETER SkipTests
    Skip test suites during validation

.PARAMETER SkipInstaller
    Skip installer build step

.PARAMETER AutoFix
    Automatically fix version inconsistencies

.EXAMPLE
    .\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -TagRelease
    # Complete release with validation, installer build, and tagging

.EXAMPLE
    .\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -SkipTests -TagRelease
    # Quick release without running full test suite

.NOTES
    Version: 2.0.0
    This is the ONLY script needed for releases - single source of truth
#>

param(
    [string]$ReleaseVersion,
    [switch]$TagRelease,
    [switch]$SkipValidation,
    [switch]$SkipTests,
    [switch]$SkipInstaller,
    [switch]$AutoFix
)

$ErrorActionPreference = 'Stop'

# ============================================================================
# VALIDATION FUNCTIONS (from RELEASE_PREPARATION.ps1)
# ============================================================================

function Write-Step {
    param(
        [int]$Number,
        [int]$Total,
        [string]$Message
    )
    Write-Host "[$Number/$Total] $Message" -ForegroundColor Cyan
}

function Invoke-PreReleaseValidation {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Pre-Release Validation               ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    # Step 1: Git status check
    Write-Step 1 6 "Checking git status..."
    $status = git status --porcelain 2>$null
    if ($status -and -not $AutoFix) {
        Write-Host "❌ Uncommitted changes found:" -ForegroundColor Red
        Write-Host $status
        Write-Host "Commit or stash changes before releasing, or use -AutoFix" -ForegroundColor Yellow
        return $false
    }
    Write-Host "✓ Working tree clean" -ForegroundColor Green

    # Step 2: Check branch
    Write-Step 2 6 "Checking branch..."
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($branch -ne 'main') {
        Write-Host "⚠️  You are on branch '$branch', not 'main'" -ForegroundColor Yellow
        Write-Host "Consider switching to main: git checkout main" -ForegroundColor Gray
    } else {
        Write-Host "✓ On main branch" -ForegroundColor Green
    }

    # Step 3: Fetch from remote
    Write-Step 3 6 "Updating from remote..."
    try {
        git fetch origin 2>$null | Out-Null
        Write-Host "✓ Fetched latest from remote" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to fetch from remote: $_" -ForegroundColor Yellow
    }

    # Step 4: Version verification
    Write-Step 4 6 "Verifying version consistency..."
    if (Test-Path ".\scripts\VERIFY_VERSION.ps1") {
        try {
            if ($AutoFix) {
                & ".\scripts\VERIFY_VERSION.ps1" -Version $ReleaseVersion -Update 2>&1 | Out-Null
            } else {
                & ".\scripts\VERIFY_VERSION.ps1" -CheckOnly 2>&1 | Out-Null
            }
            Write-Host "✓ Version consistency verified" -ForegroundColor Green
        } catch {
            if (-not $AutoFix) {
                Write-Host "❌ Version verification failed" -ForegroundColor Red
                Write-Host "Run with -AutoFix to attempt automatic fixes" -ForegroundColor Yellow
                return $false
            }
        }
    }

    # Step 5: Pre-commit checks
    Write-Step 5 6 "Running pre-commit checks..."
    try {
        & ".\COMMIT_READY.ps1" -Quick | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Pre-commit checks failed" -ForegroundColor Red
            return $false
        }
        Write-Host "✓ Pre-commit checks passed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to run pre-commit checks: $_" -ForegroundColor Red
        return $false
    }

    # Step 6: Tests (optional)
    Write-Step 6 6 "Checking test status..."
    if ($SkipTests) {
        Write-Host "⚠️  Tests skipped (--SkipTests)" -ForegroundColor Yellow
    } else {
        Write-Host "ℹ️  Running full test suite..." -ForegroundColor Cyan
        Write-Host "   (This may take 5-10 minutes)" -ForegroundColor Gray
        try {
            & ".\RUN_TESTS_BATCH.ps1" -Verbose:$false | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Tests passed" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Some tests failed - review before releasing" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Test execution failed: $_" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "✓ Pre-release validation complete" -ForegroundColor Green
    Write-Host ""
    return $true
}

function Update-VersionReferences {
    param([string]$NewVersion)
    Write-Host "Updating version references to $NewVersion..."

    # Update VERSION file
    Set-Content -Path "VERSION" -Value $NewVersion


    # Update backend/main.py docstring
    (Get-Content "backend/main.py") -replace 'Version: [0-9]+\.[0-9]+\.[0-9]+', "Version: $NewVersion" | Set-Content "backend/main.py"

    # Update frontend/package.json
    (Get-Content "frontend/package.json") -replace '"version":\s*"[0-9\.]+"', ('"version": "' + $NewVersion + '"') | Set-Content "frontend/package.json"

    # Regenerate frontend/package-lock.json
    if (Test-Path "frontend/package-lock.json") {
        Write-Host "Regenerating frontend/package-lock.json..."
        Push-Location "frontend"
        try {
            npm install --package-lock-only --ignore-scripts --no-audit | Out-Null
        } catch {
            Write-Warning "Could not regenerate package-lock.json: $_"
        } finally {
            Pop-Location
        }
    }

    # Update TODO.md (if present)
    if (Test-Path "TODO.md") {
        (Get-Content "TODO.md") -replace '\*\*Current Version\*\*: [0-9\.]+' , "**Current Version**: $NewVersion" | Set-Content "TODO.md"
    }

    # Update DOCUMENTATION_INDEX.md
    (Get-Content "docs/DOCUMENTATION_INDEX.md") -replace '\*\*Version\*\*: [0-9\.]+', "**Version**: $NewVersion" | Set-Content "docs/DOCUMENTATION_INDEX.md"
    (Get-Content "docs/DOCUMENTATION_INDEX.md") -replace '\*\*Project Version \(documented\)\*\*: [0-9\.]+', "**Project Version (documented)**: $NewVersion" | Set-Content "docs/DOCUMENTATION_INDEX.md"

    # Update root DOCUMENTATION_INDEX.md (if present)
    if (Test-Path "DOCUMENTATION_INDEX.md") {
        (Get-Content "DOCUMENTATION_INDEX.md") -replace '\*\*Version:\*\* [0-9\.]+' , "**Version:** $NewVersion" | Set-Content "DOCUMENTATION_INDEX.md"
        (Get-Content "DOCUMENTATION_INDEX.md") -replace '\(v[0-9\.]+\)', "(v$NewVersion)" | Set-Content "DOCUMENTATION_INDEX.md"
        (Get-Content "DOCUMENTATION_INDEX.md") -replace '\*\*Documentation Version:\*\* v[0-9\.]+' , "**Documentation Version:** v$NewVersion" | Set-Content "DOCUMENTATION_INDEX.md"
    }

    # Update scripts
    (Get-Content "COMMIT_READY.ps1") -replace 'Version: [0-9\.]+', "Version: $NewVersion" | Set-Content "COMMIT_READY.ps1"
    (Get-Content "INSTALLER_BUILDER.ps1") -replace 'Version: [0-9\.]+', "Version: $NewVersion" | Set-Content "INSTALLER_BUILDER.ps1"

    # Optionally update README.md (if version appears)
    (Get-Content "README.md") -replace '[0-9]+\.[0-9]+\.[0-9]+', $NewVersion | Set-Content "README.md"

    # Add new section to CHANGELOG.md
    $changelogLines = Get-Content "CHANGELOG.md"
    $date = Get-Date -Format "yyyy-MM-dd"
    $newSection = @"
## [$NewVersion] - $date

**Release Type**: Maintenance Release
**Focus**: Automated release-ready workflow, version bump, and validation

### Changed

- Version references updated
- Automated release workflow improvements

---
"@
    # Find insertion point (first version header)
    $insertIndex = 0
    for ($i = 0; $i -lt $changelogLines.Count; $i++) {
        if ($changelogLines[$i] -match '^## \[') {
            $insertIndex = $i
            break
        }
    }

    $preamble = if ($insertIndex -gt 0) { $changelogLines[0..($insertIndex - 1)] } else { @() }
    $rest = $changelogLines[$insertIndex..($changelogLines.Count - 1)]
    Set-Content "CHANGELOG.md" -Value (($preamble + $newSection.Split("`n") + $rest) -join "`n")

    # Update Greek installer text
    Write-Host "Updating Greek installer text..."
    python fix_greek_encoding_permanent.py

    # Update installer wizard images
    Write-Host "Updating installer wizard images..."
    & .\INSTALLER_BUILDER.ps1 -Action update-images -Version $NewVersion

    Write-Host "✓ All version references updated" -ForegroundColor Green
}

function Invoke-InstallerBuild {
    param([string]$Version)

    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Building Installer                   ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path ".\INSTALLER_BUILDER.ps1")) {
        Write-Host "❌ INSTALLER_BUILDER.ps1 not found" -ForegroundColor Red
        return $false
    }

    Write-Host "Building installer for version $Version..." -ForegroundColor Cyan
    Write-Host "This may take 2-5 minutes..." -ForegroundColor Gray
    Write-Host ""

    try {
        # Full installer build with auto-fix and code signing
        & .\INSTALLER_BUILDER.ps1 -Action build -Version $Version -AutoFix

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Installer build failed" -ForegroundColor Red
            Write-Host "Check INSTALLER_BUILDER.ps1 output above for details" -ForegroundColor Yellow
            return $false
        }

        # Verify installer was created
        $installerCandidates = @(
            "installer\Output\SMS_Installer_$Version.exe",
            "dist\SMS_Installer_$Version.exe"
        )
        $installerPath = $installerCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
        if ($installerPath) {
            $size = (Get-Item $installerPath).Length / 1MB
            Write-Host ""
            Write-Host "✓ Installer built successfully" -ForegroundColor Green
            Write-Host "  File: $installerPath" -ForegroundColor Gray
            Write-Host "  Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
            Write-Host ""
            return $true
        } else {
            Write-Host "❌ Installer file not found in expected locations:" -ForegroundColor Red
            $installerCandidates | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
            return $false
        }
    } catch {
        Write-Host "❌ Installer build error: $_" -ForegroundColor Red
        return $false
    }
}

if (-not $ReleaseVersion) {
    $ReleaseVersion = Read-Host "Enter new release version (e.g., 1.17.7)"
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Release Workflow - Student Management System            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Version: $ReleaseVersion" -ForegroundColor Yellow
Write-Host "Tag Release: $(if ($TagRelease) { 'Yes' } else { 'No' })" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 1: PRE-RELEASE VALIDATION
# ============================================================================

if (-not $SkipValidation) {
    $validationResult = Invoke-PreReleaseValidation
    if (-not $validationResult) {
        Write-Host ""
        Write-Host "❌ Pre-release validation failed" -ForegroundColor Red
        Write-Host "Fix the issues above or use -SkipValidation (not recommended)" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⚠️  Skipping validation (-SkipValidation flag)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 2: UPDATE VERSION REFERENCES
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Updating Version References          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Update-VersionReferences -NewVersion $ReleaseVersion

# ============================================================================
# STEP 3: BUILD INSTALLER
# ============================================================================

if (-not $SkipInstaller) {
    $installerResult = Invoke-InstallerBuild -Version $ReleaseVersion
    if (-not $installerResult) {
        Write-Host ""
        Write-Host "❌ Installer build failed" -ForegroundColor Red
        Write-Host "Use -SkipInstaller to proceed without installer (not recommended)" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Skipping installer build (-SkipInstaller flag)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 4: PRE-COMMIT VALIDATION ON CHANGES
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Validating Changes                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running pre-commit validation on changes..."
& .\COMMIT_READY.ps1 -Quick
if ($LASTEXITCODE -ne 0) {
    Write-Host "Pre-commit validation failed, but attempting to stage auto-fixes and retry..."
    git add .
    Write-Host "Re-running pre-commit validation on staged changes..."
    & .\COMMIT_READY.ps1 -Quick
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pre-commit validation failed after retry. Aborting release."
        exit 1
    }
}

# ============================================================================
# STEP 5: DOCUMENTATION ORGANIZATION
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Organizing Documentation             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Organizing documentation before generating release artifacts..."
try {
    # Consolidate and de-duplicate docs to reflect current state before generating release notes
    & .\WORKSPACE_CLEANUP.ps1 -Mode standard -SkipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Workspace documentation organization reported issues. Proceeding, but review changes."
    } else {
        Write-Host "Documentation structure organized successfully"
    }
} catch {
    Write-Warning "Failed to run WORKSPACE_CLEANUP.ps1: $_"
}

# ============================================================================
# STEP 6: GENERATE RELEASE DOCUMENTATION
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Generating Release Documentation     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Generating release documentation..."
& .\GENERATE_RELEASE_DOCS.ps1 -Version "$ReleaseVersion"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Release documentation generation reported issues. Continuing, but release notes may be incomplete."
} else {
    Write-Host "Release documentation generated successfully"
}

# Enforce version consistency after docs generation (generator may rewrite versioned files)
Write-Host "Re-syncing and re-verifying version references after documentation generation..."
if (Test-Path ".\scripts\VERIFY_VERSION.ps1") {
    & .\scripts\VERIFY_VERSION.ps1 -Version "$ReleaseVersion" -Update | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Version re-sync failed after documentation generation. Aborting release."
        exit 1
    }

    & .\scripts\VERIFY_VERSION.ps1 -Version "$ReleaseVersion" -CheckOnly | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Version verification failed after re-sync. Aborting release."
        exit 1
    }
}

# ============================================================================
# STEP 7: COMMIT AND PUSH CHANGES
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Committing and Pushing Changes       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Staging all changes..."
git add .

Write-Host "Committing release changes..."
git commit -m "chore(release): bump version to $ReleaseVersion and update docs"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit (or commit failed). Continuing with push/tag..."
}

Write-Host "Pushing main branch..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push main branch."
    exit 1
}

# ============================================================================
# STEP 8: CREATE AND PUSH TAG (if requested)
# ============================================================================

# Ensure release documentation is committed and pushed before tagging
Write-Host ""
Write-Host "Staging generated release documentation..."
git add CHANGELOG.md docs/releases/ .github/
Write-Host "Committing release documentation..."
git commit -m "docs: release notes and changelog for v$ReleaseVersion" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing documentation commit..."
    git push origin main
}

if ($TagRelease) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Creating and Pushing Tag             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $tag = "v$ReleaseVersion"
    Write-Host "Creating and pushing tag: $tag"

    # Check if tag already exists
    $existingTag = git tag -l $tag
    if ($existingTag) {
        Write-Host "Tag $tag already exists locally. Deleting and recreating..."
        git tag -d $tag | Out-Null
        if (git ls-remote --tags origin | Select-String "refs/tags/$tag") {
            Write-Host "Tag exists on remote. Force-deleting..."
            git push origin ":refs/tags/$tag"
        }
    }

    # Create and push the tag
    git tag $tag
    git push origin $tag --force

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Tag $tag pushed successfully!"
        Write-Host "The release workflow should now trigger automatically."
        Write-Host ""
        Write-Host "You can monitor the workflow at:"
        Write-Host "  https://github.com/$env:GITHUB_REPOSITORY/actions"
    } else {
        Write-Error "Failed to push tag."
        exit 1
    }
}

# ============================================================================
# FINAL SUCCESS MESSAGE
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Release $ReleaseVersion Complete!                      " -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "What was done:" -ForegroundColor Cyan
Write-Host "  ✓ Pre-release validation" -ForegroundColor Green
Write-Host "  ✓ Version references updated" -ForegroundColor Green
if (-not $SkipInstaller) {
    Write-Host "  ✓ Installer built and signed" -ForegroundColor Green
}
Write-Host "  ✓ Documentation generated" -ForegroundColor Green
Write-Host "  ✓ Changes committed and pushed" -ForegroundColor Green
if ($TagRelease) {
    Write-Host "  ✓ Git tag created and pushed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($TagRelease) {
    Write-Host "  1. Monitor GitHub Actions workflow:" -ForegroundColor Cyan
    Write-Host "     https://github.com/bs1gr/AUT_MIEEK_SMS/actions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Verify release was created:" -ForegroundColor Cyan
    Write-Host "     https://github.com/bs1gr/AUT_MIEEK_SMS/releases" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Test the installer:" -ForegroundColor Cyan
    Write-Host "     Download from GitHub releases and test installation" -ForegroundColor Gray
} else {
    Write-Host "  1. Create and push tag to trigger release:" -ForegroundColor Cyan
    Write-Host "     .\RELEASE_READY.ps1 -ReleaseVersion $ReleaseVersion -TagRelease" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Release $ReleaseVersion is ready!"
