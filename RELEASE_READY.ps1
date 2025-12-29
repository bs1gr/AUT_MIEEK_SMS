param(
    [string]$ReleaseVersion,
    [switch]$TagRelease
)

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

    # Update TODO.md
    (Get-Content "TODO.md") -replace '\*\*Current Version\*\*: [0-9\.]+', "**Current Version**: $NewVersion" | Set-Content "TODO.md"

    # Update DOCUMENTATION_INDEX.md
    (Get-Content "docs/DOCUMENTATION_INDEX.md") -replace '\*\*Version\*\*: [0-9\.]+', "**Version**: $NewVersion" | Set-Content "docs/DOCUMENTATION_INDEX.md"

    # Update root DOCUMENTATION_INDEX.md
    (Get-Content "DOCUMENTATION_INDEX.md") -replace '\*\*Version:\*\* [0-9\.]+', "**Version:** $NewVersion" | Set-Content "DOCUMENTATION_INDEX.md"
    (Get-Content "DOCUMENTATION_INDEX.md") -replace '\(v[0-9\.]+\)', "(v$NewVersion)" | Set-Content "DOCUMENTATION_INDEX.md"
    (Get-Content "DOCUMENTATION_INDEX.md") -replace '\*\*Documentation Version:\*\* v[0-9\.]+', "**Documentation Version:** v$NewVersion" | Set-Content "DOCUMENTATION_INDEX.md"

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
}

if (-not $ReleaseVersion) {
    $ReleaseVersion = Read-Host "Enter new release version (e.g., 1.12.6)"
}

Update-VersionReferences -NewVersion $ReleaseVersion

Write-Host "Running pre-commit validation..."
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

Write-Host "Generating release documentation..."
& .\GENERATE_RELEASE_DOCS.ps1 -Version "$ReleaseVersion"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Release documentation generation reported issues. Continuing, but release notes may be incomplete."
} else {
    Write-Host "Release documentation generated successfully"
}

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

# Ensure release documentation is committed and pushed before tagging
Write-Host "Staging generated release documentation..."
git add CHANGELOG.md docs/releases/ .github/
Write-Host "Committing release documentation..."
git commit -m "docs: release notes and changelog for v$ReleaseVersion" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing documentation commit..."
    git push origin main
}

if ($TagRelease) {
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

Write-Host ""
Write-Host "✅ Release $ReleaseVersion is ready and pushed!"
