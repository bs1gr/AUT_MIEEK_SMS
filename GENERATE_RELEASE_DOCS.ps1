#Requires -Version 7.0

<#
.SYNOPSIS
    Generates release documentation from git commits.

.DESCRIPTION
    Automatically creates release notes, updates CHANGELOG.md, and generates GitHub release descriptions
    by analyzing git commits since the last release tag.

.PARAMETER Version
    Target release version (e.g., "1.13.0"). If not provided, reads from VERSION file.

.PARAMETER OutputDir
    Directory to save generated documentation. Default: "docs/releases"

.PARAMETER SkipChangelog
    Skip updating CHANGELOG.md

.PARAMETER SkipReleaseNotes
    Skip creating version-specific RELEASE_NOTES file

.PARAMETER SkipGitHubRelease
    Skip creating GitHub release description file

.PARAMETER Format
    Output format for release notes. Options: 'markdown' (default), 'text', 'json'

.PARAMETER Since
    Generate notes from commits since this tag/commit. Auto-detects last tag if not provided.

.PARAMETER Preview
    Preview changes without writing files

.PARAMETER Help
    Show detailed help

.EXAMPLE
    .\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"
    Generates all release documentation for version 1.13.0

.EXAMPLE
    .\GENERATE_RELEASE_DOCS.ps1 -Preview
    Preview what would be generated without writing files

.EXAMPLE
    .\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0" -SkipChangelog
    Generate release notes but don't update CHANGELOG.md

.NOTES
    Version: 1.0
    Integrates with RELEASE_PREPARATION.ps1 and RELEASE_READY.ps1
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$Version,

    [Parameter()]
    [string]$OutputDir = "docs/releases",

    [Parameter()]
    [switch]$SkipChangelog,

    [Parameter()]
    [switch]$SkipReleaseNotes,

    [Parameter()]
    [switch]$SkipGitHubRelease,

    [Parameter()]
    [ValidateSet('markdown', 'text', 'json')]
    [string]$Format = 'markdown',

    [Parameter()]
    [string]$Since,

    [Parameter()]
    [switch]$Preview,

    [Parameter()]
    [switch]$Help
)

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param([string]$Message) Write-Host "`n[$Message]" -ForegroundColor Magenta }

# Show help
if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

# Configuration
$script:Config = @{
    ConventionalCommitTypes = @{
        'feat'     = @{ Label = 'Features'; Icon = '✨'; Priority = 1 }
        'fix'      = @{ Label = 'Bug Fixes'; Icon = '🐛'; Priority = 2 }
        'perf'     = @{ Label = 'Performance'; Icon = '⚡'; Priority = 3 }
        'security' = @{ Label = 'Security'; Icon = '🔒'; Priority = 4 }
        'refactor' = @{ Label = 'Refactoring'; Icon = '♻️'; Priority = 5 }
        'docs'     = @{ Label = 'Documentation'; Icon = '📝'; Priority = 6 }
        'style'    = @{ Label = 'Styling'; Icon = '💎'; Priority = 7 }
        'test'     = @{ Label = 'Tests'; Icon = '✅'; Priority = 8 }
        'build'    = @{ Label = 'Build System'; Icon = '🔨'; Priority = 9 }
        'ci'       = @{ Label = 'CI/CD'; Icon = '🤖'; Priority = 10 }
        'chore'    = @{ Label = 'Chores'; Icon = '🧹'; Priority = 11 }
        'revert'   = @{ Label = 'Reverts'; Icon = '⏪'; Priority = 12 }
    }
    BreakingChangeMarkers = @('BREAKING CHANGE', 'BREAKING-CHANGE', '!')
}

# Step 1: Detect version
Write-Step "1/7: Detecting version"
if (-not $Version) {
    if (Test-Path "VERSION") {
        $Version = (Get-Content "VERSION").Trim()
        Write-Info "Auto-detected version from VERSION file: $Version"
    } else {
        Write-Error "No version specified and VERSION file not found"
        exit 1
    }
}

# Validate version format (semantic versioning)
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Invalid version format: $Version (expected: X.Y.Z)"
    exit 1
}
Write-Success "Version: $Version"

# Step 2: Detect previous tag
Write-Step "2/7: Detecting previous release tag"
if (-not $Since) {
    try {
        $allTags = git tag -l "v*" --sort=-version:refname 2>$null
        if ($allTags) {
            $Since = $allTags | Select-Object -First 1
            Write-Info "Found previous tag: $Since"
        } else {
            Write-Warning "No previous tags found, using initial commit"
            $Since = (git rev-list --max-parents=0 HEAD 2>$null)
        }
    } catch {
        Write-Error "Failed to detect previous tag: $_"
        exit 1
    }
}
Write-Success "Analyzing commits since: $Since"

# Step 3: Parse git commits
Write-Step "3/7: Parsing commits"
$commits = @()
try {
    $gitLog = git log "$Since..HEAD" --pretty=format:'%H|%s|%b|%an|%ae|%ad' --date=short 2>$null
    if (-not $gitLog) {
        Write-Warning "No commits found since $Since"
        $commits = @()
    } else {
        foreach ($line in $gitLog) {
            if ($line) {
                $parts = $line -split '\|', 6
                $commits += @{
                    Hash      = $parts[0]
                    Subject   = $parts[1]
                    Body      = $parts[2]
                    Author    = $parts[3]
                    Email     = $parts[4]
                    Date      = $parts[5]
                }
            }
        }
    }
} catch {
    Write-Error "Failed to parse commits: $_"
    exit 1
}
Write-Success "Found $($commits.Count) commits"

# Step 4: Categorize commits
Write-Step "4/7: Categorizing commits"
$categorized = @{}
$breakingChanges = @()
$unrecognized = @()

foreach ($commit in $commits) {
    $subject = $commit.Subject
    $body = $commit.Body

    # Check for breaking changes
    $isBreaking = $false
    foreach ($marker in $script:Config.BreakingChangeMarkers) {
        if ($subject -match $marker -or $body -match $marker) {
            $isBreaking = $true
            $breakingChanges += $commit
            break
        }
    }

    # Extract conventional commit type
    if ($subject -match '^(\w+)(\(.+?\))?!?:\s*(.+)$') {
        $type = $matches[1]
        $scope = if ($matches[2]) { $matches[2].Trim('(', ')') } else { $null }
        $description = $matches[3]

        if ($script:Config.ConventionalCommitTypes.ContainsKey($type)) {
            if (-not $categorized.ContainsKey($type)) {
                $categorized[$type] = @()
            }
            $categorized[$type] += @{
                Commit      = $commit
                Scope       = $scope
                Description = $description
                Breaking    = $isBreaking
            }
        } else {
            $unrecognized += $commit
        }
    } else {
        $unrecognized += $commit
    }
}

Write-Success "Categorized into $($categorized.Keys.Count) types"
if ($breakingChanges.Count -gt 0) {
    Write-Warning "Found $($breakingChanges.Count) breaking changes"
}
if ($unrecognized.Count -gt 0) {
    Write-Warning "Found $($unrecognized.Count) unrecognized commits"
}

# Step 5: Generate release notes
Write-Step "5/7: Generating release notes"

function Get-ReleaseNotesMarkdown {
    param($Version, $Categorized, $BreakingChanges, $Unrecognized, $Since)

    $sb = [System.Text.StringBuilder]::new()

    # Header
    [void]$sb.AppendLine("# Release Notes - Version $Version")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Release Date**: $(Get-Date -Format 'yyyy-MM-dd')")
    [void]$sb.AppendLine("**Previous Version**: $Since")
    [void]$sb.AppendLine()

    # Breaking changes (if any)
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("## ⚠️ BREAKING CHANGES")
        [void]$sb.AppendLine()
        foreach ($commit in $BreakingChanges) {
            [void]$sb.AppendLine("- **$($commit.Subject)** [$($commit.Hash.Substring(0,7))]")
            if ($commit.Body) {
                [void]$sb.AppendLine("  $($commit.Body)")
            }
        }
        [void]$sb.AppendLine()
    }

    # Categorized changes
    $sortedTypes = $Categorized.Keys | Sort-Object {
        $script:Config.ConventionalCommitTypes[$_].Priority
    }

    foreach ($type in $sortedTypes) {
        $config = $script:Config.ConventionalCommitTypes[$type]
        $items = $Categorized[$type]

        [void]$sb.AppendLine("## $($config.Icon) $($config.Label)")
        [void]$sb.AppendLine()

        foreach ($item in $items) {
            $prefix = if ($item.Scope) { "**$($item.Scope)**: " } else { "" }
            $breaking = if ($item.Breaking) { " 🚨 **BREAKING**" } else { "" }
            [void]$sb.AppendLine("- $prefix$($item.Description)$breaking [$($item.Commit.Hash.Substring(0,7))]")
        }
        [void]$sb.AppendLine()
    }

    # Unrecognized commits
    if ($Unrecognized.Count -gt 0) {
        [void]$sb.AppendLine("## 📦 Other Changes")
        [void]$sb.AppendLine()
        foreach ($commit in $Unrecognized) {
            [void]$sb.AppendLine("- $($commit.Subject) [$($commit.Hash.Substring(0,7))]")
        }
        [void]$sb.AppendLine()
    }

    # Statistics
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("### 📊 Statistics")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("- **Total Commits**: $($commits.Count)")
    [void]$sb.AppendLine("- **Contributors**: $(($commits | Select-Object -Unique -ExpandProperty Author).Count)")
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("- **Breaking Changes**: $($BreakingChanges.Count)")
    }
    [void]$sb.AppendLine()

    return $sb.ToString()
}

function Get-ChangelogEntry {
    param($Version, $Categorized, $BreakingChanges, $Since)

    $sb = [System.Text.StringBuilder]::new()

    [void]$sb.AppendLine("## [$Version] - $(Get-Date -Format 'yyyy-MM-dd')")
    [void]$sb.AppendLine()

    # Breaking changes first
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("### ⚠️ BREAKING CHANGES")
        foreach ($commit in $BreakingChanges) {
            [void]$sb.AppendLine("- $($commit.Subject)")
        }
        [void]$sb.AppendLine()
    }

    # Categorized changes
    $sortedTypes = $Categorized.Keys | Sort-Object {
        $script:Config.ConventionalCommitTypes[$_].Priority
    }

    foreach ($type in $sortedTypes) {
        $config = $script:Config.ConventionalCommitTypes[$type]
        $items = $Categorized[$type]

        [void]$sb.AppendLine("### $($config.Label)")
        foreach ($item in $items) {
            $prefix = if ($item.Scope) { "**$($item.Scope)**: " } else { "" }
            [void]$sb.AppendLine("- $prefix$($item.Description)")
        }
        [void]$sb.AppendLine()
    }

    return $sb.ToString()
}

function Get-GitHubReleaseDescription {
    param($Version, $Categorized, $BreakingChanges, $Unrecognized)

    $sb = [System.Text.StringBuilder]::new()

    # Summary
    [void]$sb.AppendLine("## What's New in v$Version")
    [void]$sb.AppendLine()

    # Breaking changes warning
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("> **⚠️ WARNING**: This release contains breaking changes. Please review carefully before upgrading.")
        [void]$sb.AppendLine()
    }

    # Highlights (top 5 features/fixes)
    $highlights = @()
    if ($Categorized.ContainsKey('feat')) {
        $highlights += $Categorized['feat'] | Select-Object -First 3
    }
    if ($Categorized.ContainsKey('fix')) {
        $highlights += $Categorized['fix'] | Select-Object -First 2
    }

    if ($highlights.Count -gt 0) {
        [void]$sb.AppendLine("### 🌟 Highlights")
        [void]$sb.AppendLine()
        foreach ($item in $highlights) {
            $prefix = if ($item.Scope) { "**$($item.Scope)**: " } else { "" }
            [void]$sb.AppendLine("- $prefix$($item.Description)")
        }
        [void]$sb.AppendLine()
    }

    # Full changelog link
    [void]$sb.AppendLine("### 📋 Full Changelog")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("See [CHANGELOG.md](CHANGELOG.md) for complete details.")
    [void]$sb.AppendLine()

    # Installation
    [void]$sb.AppendLine("### 📦 Installation")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Windows Installer**: Download `StudentManagementSystem_${Version}_Setup.exe` from the assets below.")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Docker**:")
    [void]$sb.AppendLine("``````powershell")
    [void]$sb.AppendLine("# Pull the new version")
    [void]$sb.AppendLine(".\DOCKER.ps1 -Update")
    [void]$sb.AppendLine("``````")
    [void]$sb.AppendLine()

    return $sb.ToString()
}

$releaseNotes = Get-ReleaseNotesMarkdown -Version $Version -Categorized $categorized `
    -BreakingChanges $breakingChanges -Unrecognized $unrecognized -Since $Since

$changelogEntry = Get-ChangelogEntry -Version $Version -Categorized $categorized `
    -BreakingChanges $breakingChanges -Since $Since

$githubRelease = Get-GitHubReleaseDescription -Version $Version -Categorized $categorized `
    -BreakingChanges $breakingChanges -Unrecognized $unrecognized

Write-Success "Generated all documentation formats"

# Step 6: Preview or write files
Write-Step "6/7: Writing output files"

if ($Preview) {
    Write-Info "PREVIEW MODE - No files will be written"
    Write-Host "`n=== RELEASE NOTES ===" -ForegroundColor Cyan
    Write-Host $releaseNotes
    Write-Host "`n=== CHANGELOG ENTRY ===" -ForegroundColor Cyan
    Write-Host $changelogEntry
    Write-Host "`n=== GITHUB RELEASE ===" -ForegroundColor Cyan
    Write-Host $githubRelease
} else {
    # Create output directory
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-Info "Created output directory: $OutputDir"
    }

    # Write release notes
    if (-not $SkipReleaseNotes) {
        $releaseNotesPath = Join-Path $OutputDir "RELEASE_NOTES_v${Version}.md"
        $releaseNotes | Set-Content -Path $releaseNotesPath -Encoding UTF8
        Write-Success "Created: $releaseNotesPath"
    }

    # Update CHANGELOG.md
    if (-not $SkipChangelog) {
        if (Test-Path "CHANGELOG.md") {
            $changelog = Get-Content "CHANGELOG.md" -Raw

            # Insert new entry after header
            if ($changelog -match '(?s)(# Changelog.*?(?=## \[|\z))') {
                $header = $matches[1]
                $rest = $changelog.Substring($header.Length)
                $newChangelog = $header + "`n" + $changelogEntry + $rest
                $newChangelog | Set-Content -Path "CHANGELOG.md" -Encoding UTF8
                Write-Success "Updated: CHANGELOG.md"
            } else {
                Write-Warning "Could not parse CHANGELOG.md format, skipping update"
            }
        } else {
            # Create new CHANGELOG.md
            $newChangelog = "# Changelog`n`nAll notable changes to this project will be documented in this file.`n`n" + $changelogEntry
            $newChangelog | Set-Content -Path "CHANGELOG.md" -Encoding UTF8
            Write-Success "Created: CHANGELOG.md"
        }
    }

    # Write GitHub release description
    if (-not $SkipGitHubRelease) {
        $githubReleasePath = Join-Path $OutputDir "GITHUB_RELEASE_v${Version}.md"
        $githubRelease | Set-Content -Path $githubReleasePath -Encoding UTF8
        Write-Success "Created: $githubReleasePath"
    }
}

# Step 7: Summary
Write-Step "7/7: Summary"
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✓ Release Documentation Generated                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if (-not $Preview) {
    Write-Info "Next steps:"
    Write-Host "  1. Review generated documentation in: $OutputDir"
    Write-Host "  2. Commit changes: git add CHANGELOG.md $OutputDir && git commit -m 'docs: release $Version'"
    Write-Host "  3. Run release: .\RELEASE_READY.ps1 -ReleaseVersion $Version -TagRelease"
    Write-Host ""
    Write-Info "GitHub release description saved to: $OutputDir/GITHUB_RELEASE_v${Version}.md"
    Write-Info "Use this content when creating the GitHub release"
}

exit 0
