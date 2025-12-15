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
    (Get-Content "frontend/package.json") -replace '"version":\s*"[0-9\.]+"', '"version": "' + $NewVersion + '"' | Set-Content "frontend/package.json"

    # Update TODO.md
    (Get-Content "TODO.md") -replace '\*\*Current Version\*\*: [0-9\.]+', "**Current Version**: $NewVersion" | Set-Content "TODO.md"

    # Update DOCUMENTATION_INDEX.md
    (Get-Content "docs/DOCUMENTATION_INDEX.md") -replace '\*\*Version\*\*: [0-9\.]+', "**Version**: $NewVersion" | Set-Content "docs/DOCUMENTATION_INDEX.md"

    # Optionally update README.md (if version appears)
    (Get-Content "README.md") -replace '[0-9]+\.[0-9]+\.[0-9]+', $NewVersion | Set-Content "README.md"

    # Add new section to CHANGELOG.md
    $changelog = Get-Content "CHANGELOG.md"
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
    Set-Content "CHANGELOG.md" -Value ($newSection + ($changelog -join "`n"))
}

if (-not $ReleaseVersion) {
    $ReleaseVersion = Read-Host "Enter new release version (e.g., 1.12.6)"
}

Update-VersionReferences -NewVersion $ReleaseVersion

Write-Host "Running pre-commit validation..."
& .\COMMIT_READY.ps1 -Quick
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pre-commit validation failed. Aborting release."
    exit 1
}

git add .
git commit -m "chore(release): bump version to $ReleaseVersion and update docs"

if ($TagRelease) {
    git tag v$ReleaseVersion
    git push origin v$ReleaseVersion
}

git push origin main

Write-Host "Release $ReleaseVersion is ready and pushed!"
