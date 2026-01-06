# Post-Phase 1 Automation Helper
# Purpose: Automate remaining manual tasks for v1.15.0 release and Phase 2 setup
# Created: January 6, 2026

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('Status', 'OpenGitHub', 'CopyRelease', 'CopyIssue', 'ValidateRelease', 'CreateRelease', 'Help')]
    [string]$Action = 'Status',

    [Parameter(Mandatory=$false)]
    [string]$Tag = ""
)

$ErrorActionPreference = 'Stop'

# Repository information
$RepoOwner = 'bs1gr'
$RepoName = 'AUT_MIEEK_SMS'
$Version = '1.15.0'
$ReleaseURL = "https://github.com/$RepoOwner/$RepoName/releases/new"
$IssuesURL = "https://github.com/$RepoOwner/$RepoName/issues/new"

# File paths
$ReleaseNotesFile = "docs\releases\RELEASE_NOTES_v$Version.md"
$GitHubReleaseFile = "docs\releases\GITHUB_RELEASE_v$Version.md"
$GitHubIssuesFile = "docs\releases\GITHUB_ISSUES_PHASE2.md"
$ReleaseChecklistFile = "docs\releases\RELEASE_CHECKLIST_v$Version.md"

function Show-Status {
    Write-Host "`n=== v$Version Release Status ===" -ForegroundColor Cyan
    Write-Host ""

    # Check file existence
    $filesExist = @{
        "Release Notes" = Test-Path $ReleaseNotesFile
        "GitHub Release Draft" = Test-Path $GitHubReleaseFile
        "GitHub Issues Template" = Test-Path $GitHubIssuesFile
        "Release Checklist" = Test-Path $ReleaseChecklistFile
    }

    Write-Host "📄 Documentation Files:" -ForegroundColor Yellow
    foreach ($file in $filesExist.GetEnumerator()) {
        $status = if ($file.Value) { "✅" } else { "❌" }
        Write-Host "  $status $($file.Key)"
    }

    Write-Host ""
    Write-Host "⏳ Pending Manual Tasks:" -ForegroundColor Yellow
    Write-Host "  1. Create GitHub Release (15 minutes)"
    Write-Host "  2. Create 13 GitHub Issues for Phase 2 (1 hour)"
    Write-Host "  3. Monitor E2E tests in CI (ongoing)"
    Write-Host ""
    Write-Host "🔗 Quick Links:" -ForegroundColor Yellow
    Write-Host "  Release URL: $ReleaseURL"
    Write-Host "  Issues URL:  $IssuesURL"
    Write-Host ""
}

function Open-GitHubRelease {
    Write-Host "Opening GitHub Release page..." -ForegroundColor Green
    Start-Process $ReleaseURL
    Write-Host "✅ Opened in browser" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Tag version: v$Version"
    Write-Host "  2. Target: main"
    Write-Host "  3. Copy release body with: .\RELEASE_HELPER.ps1 -Action CopyRelease"
    Write-Host "  4. Paste into GitHub"
    Write-Host "  5. Check 'Set as the latest release'"
    Write-Host "  6. Publish!"
}

function Copy-ReleaseBody {
    if (-not (Test-Path $GitHubReleaseFile)) {
        Write-Host "❌ Error: GitHub release file not found: $GitHubReleaseFile" -ForegroundColor Red
        return
    }

    # Read the file and extract the release body section
    $content = Get-Content $GitHubReleaseFile -Raw

    # Extract content between the markdown code block markers
    if ($content -match '(?s)```markdown\s*\n(.+?)\n```') {
        $releaseBody = $matches[1].Trim()

        # Copy to clipboard
        $releaseBody | Set-Clipboard

        Write-Host "✅ Release body copied to clipboard!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Release title:" -ForegroundColor Yellow
        Write-Host "  v$Version - Phase 1 Complete: Infrastructure & UX Improvements"
        Write-Host ""
        Write-Host "Tag:" -ForegroundColor Yellow
        Write-Host "  v$Version"
        Write-Host ""
        Write-Host "Now paste into GitHub Release page!" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error: Could not extract release body from file" -ForegroundColor Red
    }
}

function Copy-IssueTemplate {
    param([int]$IssueNumber = 68)

    if (-not (Test-Path $GitHubIssuesFile)) {
        Write-Host "❌ Error: GitHub issues file not found: $GitHubIssuesFile" -ForegroundColor Red
        return
    }

    Write-Host "📋 Available issues to create:" -ForegroundColor Cyan
    Write-Host "  #68 - RBAC Permission Matrix Design (CRITICAL)"
    Write-Host "  #69 - Database Schema for Permissions (CRITICAL)"
    Write-Host "  #70 - Backend Permission Utilities (HIGH)"
    Write-Host "  #71 - Refactor Endpoints (HIGH)"
    Write-Host "  #72 - Permission Management API (HIGH)"
    Write-Host "  #73 - Permission Management UI (MEDIUM, optional)"
    Write-Host "  #74 - E2E Test CI Monitoring (HIGH)"
    Write-Host "  #75 - Coverage Reporting (HIGH)"
    Write-Host "  #76 - CI Cache Optimization (LOW)"
    Write-Host "  #77 - Load Testing Integration (MEDIUM)"
    Write-Host "  #78 - Admin Permission Guide (MEDIUM)"
    Write-Host "  #79 - Testing Documentation (LOW)"
    Write-Host "  #80 - v1.16.0 Release Prep (RELEASE)"
    Write-Host ""
    Write-Host "💡 Tip: Open the file $GitHubIssuesFile" -ForegroundColor Yellow
    Write-Host "   and copy each issue template manually to GitHub." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or use the 'OpenGitHub' action to open the issues page."

    # Open the issues page
    Start-Process $IssuesURL
    Write-Host "✅ Opened GitHub Issues page in browser" -ForegroundColor Green
}

function Test-ReleaseReadiness {
    Write-Host "`n=== Release Readiness Validation ===" -ForegroundColor Cyan
    Write-Host ""

    $checks = @()

    # Check VERSION file
    if (Test-Path "VERSION") {
        $versionContent = (Get-Content "VERSION").Trim()
        $versionCheck = $versionContent -eq $Version
        $checks += @{
            Name = "VERSION file"
            Status = $versionCheck
            Value = $versionContent
        }
    } else {
        $checks += @{
            Name = "VERSION file"
            Status = $false
            Value = "Not found"
        }
    }

    # Check CHANGELOG.md
    if (Test-Path "CHANGELOG.md") {
        $changelogContent = Get-Content "CHANGELOG.md" -Raw
        $changelogCheck = $changelogContent -match "\[1\.15\.0\]"
        $checks += @{
            Name = "CHANGELOG.md entry"
            Status = $changelogCheck
            Value = if ($changelogCheck) { "Found" } else { "Missing v1.15.0 entry" }
        }
    } else {
        $checks += @{
            Name = "CHANGELOG.md"
            Status = $false
            Value = "Not found"
        }
    }

    # Check documentation files
    $checks += @{
        Name = "Release notes"
        Status = Test-Path $ReleaseNotesFile
        Value = $ReleaseNotesFile
    }

    $checks += @{
        Name = "GitHub release draft"
        Status = Test-Path $GitHubReleaseFile
        Value = $GitHubReleaseFile
    }

    $checks += @{
        Name = "Phase 2 issues template"
        Status = Test-Path $GitHubIssuesFile
        Value = $GitHubIssuesFile
    }

    # Display results
    foreach ($check in $checks) {
        $symbol = if ($check.Status) { "✅" } else { "❌" }
        $color = if ($check.Status) { "Green" } else { "Red" }
        Write-Host "  $symbol $($check.Name): " -NoNewline -ForegroundColor $color
        Write-Host $check.Value -ForegroundColor Gray
    }

    Write-Host ""
    $allPassed = ($checks | Where-Object { -not $_.Status }).Count -eq 0

    if ($allPassed) {
        Write-Host "✅ All checks passed! Ready to create GitHub Release." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some checks failed. Review before publishing release." -ForegroundColor Yellow
    }

    Write-Host ""
}

function New-GitHubRelease {
    param([string]$ReleaseTag = "")

    if (-not $ReleaseTag) {
        $ReleaseTag = "v$Version"
    }

    Write-Host "`n=== Creating GitHub Release $ReleaseTag ===" -ForegroundColor Cyan
    Write-Host ""

    # Check if gh CLI is available
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "❌ GitHub CLI not found. Install from: https://cli.github.com/" -ForegroundColor Red
        return
    }

    # Check authentication
    $authStatus = & gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not authenticated with GitHub CLI. Run: gh auth login" -ForegroundColor Red
        return
    }

    # Check if release already exists
    $existingRelease = & gh release view $ReleaseTag --repo $RepoOwner/$RepoName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⚠️  Release $ReleaseTag already exists!" -ForegroundColor Yellow
        Write-Host ""
        $response = Read-Host "Update existing release instead? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Update-GitHubRelease -ReleaseTag $ReleaseTag
            return
        } else {
            Write-Host "Aborted." -ForegroundColor Gray
            return
        }
    }

    # Check if release template exists
    if (-not (Test-Path $GitHubReleaseFile)) {
        Write-Host "❌ Release template not found: $GitHubReleaseFile" -ForegroundColor Red
        return
    }

    # Extract release body
    Write-Host "Extracting release body from template..." -ForegroundColor Cyan
    $content = Get-Content $GitHubReleaseFile -Raw
    $pattern = '(?s)## Release Body\s+```markdown\s+(.+?)\s+```'

    if ($content -match $pattern) {
        $releaseBody = $matches[1].Trim()
        Write-Host "✅ Release body extracted ($($releaseBody.Length) characters)" -ForegroundColor Green

        # Save to temp file
        $tempFile = "temp_release_body_create.md"
        $releaseBody | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

        try {
            Write-Host ""
            Write-Host "Creating GitHub release..." -ForegroundColor Cyan

            # Create the release
            & gh release create $ReleaseTag `
                --repo "$RepoOwner/$RepoName" `
                --title "$ReleaseTag - Phase 1 Complete: Infrastructure & UX Improvements" `
                --notes-file $tempFile `
                --target main

            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Release $ReleaseTag created successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "📝 Release includes:" -ForegroundColor Yellow
                Write-Host "   • 8 Phase 1 features highlighted" -ForegroundColor White
                Write-Host "   • Performance metrics table" -ForegroundColor White
                Write-Host "   • Security enhancements" -ForegroundColor White
                Write-Host "   • Upgrade instructions" -ForegroundColor White
                Write-Host "   • Phase 2 preview" -ForegroundColor White
                Write-Host ""
                Write-Host "🔗 View at: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Failed to create release" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "❌ Error creating release: $_" -ForegroundColor Red
        }
        finally {
            # Cleanup
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force
            }
        }
    } else {
        Write-Host "❌ Could not extract release body from template" -ForegroundColor Red
    }
}

function Update-GitHubRelease {
    param([string]$ReleaseTag = "")

    if (-not $ReleaseTag) {
        $ReleaseTag = "v$Version"
    }

    Write-Host "`n=== Updating GitHub Release $ReleaseTag ===" -ForegroundColor Cyan
    Write-Host ""

    # Check if gh CLI is available
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "❌ GitHub CLI not found. Install from: https://cli.github.com/" -ForegroundColor Red
        return
    }

    # Extract release body
    if (-not (Test-Path $GitHubReleaseFile)) {
        Write-Host "❌ Release template not found: $GitHubReleaseFile" -ForegroundColor Red
        return
    }

    Write-Host "Extracting release body from template..." -ForegroundColor Cyan
    $content = Get-Content $GitHubReleaseFile -Raw
    $pattern = '(?s)## Release Body\s+```markdown\s+(.+?)\s+```'

    if ($content -match $pattern) {
        $releaseBody = $matches[1].Trim()
        Write-Host "✅ Release body extracted ($($releaseBody.Length) characters)" -ForegroundColor Green

        # Save to temp file
        $tempFile = "temp_release_body_update.md"
        $releaseBody | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

        try {
            Write-Host ""
            Write-Host "Updating GitHub release..." -ForegroundColor Cyan

            # Update the release
            & gh release edit $ReleaseTag `
                --repo "$RepoOwner/$RepoName" `
                --notes-file $tempFile `
                --title "$ReleaseTag - Phase 1 Complete: Infrastructure & UX Improvements"

            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Release $ReleaseTag updated successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "🔗 View at: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Failed to update release" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "❌ Error updating release: $_" -ForegroundColor Red
        }
        finally {
            # Cleanup
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force
            }
        }
    } else {
        Write-Host "❌ Could not extract release body from template" -ForegroundColor Red
    }
}

function Test-ReleaseReadiness {
    Write-Host "`n=== Release Readiness Validation ===" -ForegroundColor Cyan
    Write-Host ""

    $checks = @()

    # Check VERSION file
    if (Test-Path "VERSION") {
        $versionContent = (Get-Content "VERSION").Trim()
        $versionCheck = $versionContent -eq $Version
        $checks += @{
            Name = "VERSION file"
            Status = $versionCheck
            Value = $versionContent
        }
    } else {
        $checks += @{
            Name = "VERSION file"
            Status = $false
            Value = "Not found"
        }
    }

    # Check CHANGELOG.md
    if (Test-Path "CHANGELOG.md") {
        $changelogContent = Get-Content "CHANGELOG.md" -Raw
        $changelogCheck = $changelogContent -match "\[1\.15\.0\]"
        $checks += @{
            Name = "CHANGELOG.md entry"
            Status = $changelogCheck
            Value = if ($changelogCheck) { "Found" } else { "Missing v1.15.0 entry" }
        }
    } else {
        $checks += @{
            Name = "CHANGELOG.md"
            Status = $false
            Value = "Not found"
        }
    }

    # Check documentation files
    $checks += @{
        Name = "Release notes"
        Status = Test-Path $ReleaseNotesFile
        Value = $ReleaseNotesFile
    }

    $checks += @{
        Name = "GitHub release draft"
        Status = Test-Path $GitHubReleaseFile
        Value = $GitHubReleaseFile
    }

    $checks += @{
        Name = "Phase 2 issues template"
        Status = Test-Path $GitHubIssuesFile
        Value = $GitHubIssuesFile
    }

    # Display results
    foreach ($check in $checks) {
        $symbol = if ($check.Status) { "✅" } else { "❌" }
        $color = if ($check.Status) { "Green" } else { "Red" }
        Write-Host "  $symbol $($check.Name): " -NoNewline -ForegroundColor $color
        Write-Host $check.Value -ForegroundColor Gray
    }

    Write-Host ""
    $allPassed = ($checks | Where-Object { -not $_.Status }).Count -eq 0

    if ($allPassed) {
        Write-Host "✅ All checks passed! Ready to create GitHub Release." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some checks failed. Review before publishing release." -ForegroundColor Yellow
    }

    Write-Host ""
}

function Show-Help {
    Write-Host "`n=== Release Helper - v$Version ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Purpose: Automate and assist with v$Version release tasks" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\RELEASE_HELPER.ps1 -Action <ActionName> [-Tag <version>]"
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  Status          - Show current release status (default)"
    Write-Host "  OpenGitHub      - Open GitHub Release creation page"
    Write-Host "  CopyRelease     - Copy release body to clipboard"
    Write-Host "  CopyIssue       - Open GitHub Issues page"
    Write-Host "  ValidateRelease - Validate release readiness"
    Write-Host "  CreateRelease   - Create new GitHub release using gh CLI"
    Write-Host "  Help            - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\RELEASE_HELPER.ps1                              # Show status"
    Write-Host "  .\RELEASE_HELPER.ps1 -Action OpenGitHub           # Open release page"
    Write-Host "  .\RELEASE_HELPER.ps1 -Action CopyRelease          # Copy release body"
    Write-Host "  .\RELEASE_HELPER.ps1 -Action ValidateRelease      # Validate release"
    Write-Host "  .\RELEASE_HELPER.ps1 -Action CreateRelease        # Create release via CLI"
    Write-Host "  .\RELEASE_HELPER.ps1 -Action CreateRelease -Tag v1.16.0  # Custom tag"
    Write-Host ""
    Write-Host "Quick Workflow (Manual):" -ForegroundColor Cyan
    Write-Host "  1. .\RELEASE_HELPER.ps1 -Action ValidateRelease"
    Write-Host "  2. .\RELEASE_HELPER.ps1 -Action OpenGitHub"
    Write-Host "  3. .\RELEASE_HELPER.ps1 -Action CopyRelease"
    Write-Host "  4. Paste into GitHub and publish"
    Write-Host ""
    Write-Host "Quick Workflow (Automated via gh CLI):" -ForegroundColor Cyan
    Write-Host "  1. .\RELEASE_HELPER.ps1 -Action ValidateRelease"
    Write-Host "  2. .\RELEASE_HELPER.ps1 -Action CreateRelease"
    Write-Host "  3. Done!"
    Write-Host ""
    Write-Host "Note:" -ForegroundColor Yellow
    Write-Host "  CreateRelease requires GitHub CLI (gh) installed and authenticated."
    Write-Host "  Install from: https://cli.github.com/"
    Write-Host ""
}

# Main execution
switch ($Action) {
    'Status' { Show-Status }
    'OpenGitHub' { Open-GitHubRelease }
    'CopyRelease' { Copy-ReleaseBody }
    'CopyIssue' { Copy-IssueTemplate }
    'ValidateRelease' { Test-ReleaseReadiness }
    'CreateRelease' { New-GitHubRelease -ReleaseTag $Tag }
    'Help' { Show-Help }
}
