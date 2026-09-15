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
    Integrates with the active release workflow via RELEASE_READY.ps1 and RELEASE_WITH_DOCS.ps1
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
    [switch]$ForceOverwrite,

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
    # Kept for reference only — breaking-change detection is done with explicit
    # Conventional Commits regexes at the categorisation step, not by substring match.
    # A bare '!' here was matched as a regex against subject and body, flagging any
    # message containing an exclamation mark as a breaking change.
    BreakingChangeMarkers = @('BREAKING CHANGE', 'BREAKING-CHANGE')
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
# One record per COMMIT, not per line. The previous format was
# '%H|%s|%b|%an|%ae|%ad' consumed line-by-line, but %b is the commit body and is
# usually multi-line, so PowerShell saw one element per line: a 29-commit range with
# detailed messages parsed as "575 commits, 546 unrecognized". Body is now last (so a
# '|' inside it cannot shift the other fields) and records are separated by a marker
# that cannot occur in a message, so bodies may span as many lines as they like.
$RecordSep = '@@SMS-COMMIT-RECORD@@'
try {
    $gitLog = (git log "$Since..HEAD" --pretty=format:"%H|%s|%an|%ae|%ad|%b$RecordSep" --date=short 2>$null) -join "`n"
    if (-not $gitLog) {
        Write-Warning "No commits found since $Since"
        $commits = @()
    } else {
        $records = $gitLog -split [regex]::Escape($RecordSep)
        foreach ($record in $records) {
            $record = $record.Trim("`r", "`n")
            if (-not $record) { continue }
            $parts = $record -split '\|', 6
            if ($parts.Count -lt 5) { continue }
            $commits += @{
                Hash      = $parts[0]
                Subject   = $parts[1]
                Author    = $parts[2]
                Email     = $parts[3]
                Date      = $parts[4]
                Body      = if ($parts.Count -ge 6) { $parts[5] } else { '' }
            }
        }
    }
} catch {
    Write-Error "Failed to parse commits: $_"
    exit 1
}
Write-Success "Found $($commits.Count) commits"

# Cross-check against git's own count — if these disagree the parser is mis-splitting
# again, which is how the 575-vs-29 discrepancy went unnoticed for so long.
$expectedCount = [int](git rev-list --count "$Since..HEAD" 2>$null)
if ($expectedCount -gt 0 -and $commits.Count -ne $expectedCount) {
    Write-Warning "Parsed $($commits.Count) commits but git reports $expectedCount in $Since..HEAD — commit parsing is unreliable, review the generated notes."
}

# Step 4: Categorize commits
Write-Step "4/7: Categorizing commits"
$categorized = @{}
$breakingChanges = @()
$unrecognized = @()

foreach ($commit in $commits) {
    $subject = $commit.Subject
    $body = $commit.Body

    # Check for breaking changes.
    #
    # Conventional Commits defines exactly two markers: a "!" placed immediately before
    # the colon in the subject (feat(api)!: drop v1 endpoints), or a "BREAKING CHANGE:"
    # / "BREAKING-CHANGE:" footer. The previous implementation regex-matched each entry
    # of BreakingChangeMarkers against the subject OR body, and one of those entries was
    # a bare "!" — so any message containing an exclamation mark anywhere marked the
    # whole release as breaking. It was masked by the commit-parsing bug above; with
    # bodies parsed correctly it fired on a commit body quoting a password that ended
    # in "!", which would have published a "BREAKING CHANGES - MAJOR Release" banner on
    # an ordinary patch release.
    $isBreaking = ($subject -match '^\w+(\([^)]*\))?!:') -or
                  ($body -match '(?m)^\s*BREAKING[ -]CHANGE\s*:')
    if ($isBreaking) {
        $breakingChanges += $commit
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
            $hash = ""
            if ($commit.Hash) {
                if ($commit.Hash.Length -ge 7) { $hash = $commit.Hash.Substring(0,7) } else { $hash = $commit.Hash }
            }
            if ($hash) {
                [void]$sb.AppendLine("- **$($commit.Subject)** [$hash]")
            } else {
                [void]$sb.AppendLine("- **$($commit.Subject)**")
            }
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
            $commitHash = ""
            if ($item.Commit -and $item.Commit.Hash) {
                if ($item.Commit.Hash.Length -ge 7) { $commitHash = $item.Commit.Hash.Substring(0,7) } else { $commitHash = $item.Commit.Hash }
            }
            if ($commitHash) {
                [void]$sb.AppendLine("- $prefix$($item.Description)$breaking [$commitHash]")
            } else {
                [void]$sb.AppendLine("- $prefix$($item.Description)$breaking")
            }
        }
        [void]$sb.AppendLine()
    }

    # Unrecognized commits
    if ($Unrecognized.Count -gt 0) {
        [void]$sb.AppendLine("## 📦 Other Changes")
        [void]$sb.AppendLine()
        foreach ($commit in $Unrecognized) {
            $hash = ""
            if ($commit.Hash) {
                if ($commit.Hash.Length -ge 7) { $hash = $commit.Hash.Substring(0,7) } else { $hash = $commit.Hash }
            }
            if ($hash) {
                [void]$sb.AppendLine("- $($commit.Subject) [$hash]")
            } else {
                [void]$sb.AppendLine("- $($commit.Subject)")
            }
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

    # Installation (avoid fenced code blocks to keep Actions script safe).
    # The asset name here was "StudentManagementSystem_<ver>_Setup.exe", which this
    # project has never published — the real asset is SMS_Installer_<ver>.exe. The
    # Docker path was also the pre-flatten .\DOCKER.ps1, moved in June 2026.
    [void]$sb.AppendLine("### 📦 Installation")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("Windows Installer: Download SMS_Installer_${Version}.exe from the assets below.")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("Docker: Run .\\infra\\scripts\\dev\\DOCKER.ps1 -Update to pull the new version.")
    [void]$sb.AppendLine()

    # Documentation changes (aggregate across workspace)
    try {
        $docFiles = git diff "$Since..HEAD" --name-only -- 'docs/**' 'README.md' 'DOCUMENTATION_INDEX.md' '*.md' 2>$null
        if ($docFiles) {
            [void]$sb.AppendLine("### 📚 Documentation Changes")
            [void]$sb.AppendLine()
            foreach ($f in $docFiles | Sort-Object) {
                [void]$sb.AppendLine("- $f")
            }
            [void]$sb.AppendLine()
        }
    } catch {}

    return $sb.ToString()
}

$releaseNotes = Get-ReleaseNotesMarkdown -Version $Version -Categorized $categorized `
    -BreakingChanges $breakingChanges -Unrecognized $unrecognized -Since $Since

$changelogEntry = Get-ChangelogEntry -Version $Version -Categorized $categorized `
    -BreakingChanges $breakingChanges -Since $Since

# Prefer comprehensive external helper if available
$__helperPath = Join-Path "scripts" "generate-release-github-description.ps1"
if (Test-Path $__helperPath) {
    try {
        $githubRelease = & $__helperPath -Version $Version -BreakingChanges $breakingChanges -Categorized $categorized
    } catch {
        Write-Warning "Helper script failed, falling back to basic release description: $_"
        $githubRelease = Get-GitHubReleaseDescription -Version $Version -Categorized $categorized `
            -BreakingChanges $breakingChanges -Unrecognized $unrecognized
    }
} else {
    $githubRelease = Get-GitHubReleaseDescription -Version $Version -Categorized $categorized `
        -BreakingChanges $breakingChanges -Unrecognized $unrecognized
}

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
        if ((Test-Path $releaseNotesPath) -and -not $ForceOverwrite) {
            Write-Info "Preserving existing release notes (curated): $releaseNotesPath"
            Write-Info "Use -ForceOverwrite to regenerate generic release notes"
        } else {
            $releaseNotes | Set-Content -Path $releaseNotesPath -Encoding UTF8
            Write-Success "Created: $releaseNotesPath"
        }
    }

    # Update CHANGELOG.md
    if (-not $SkipChangelog) {
        if (Test-Path "CHANGELOG.md") {
            $changelog = Get-Content "CHANGELOG.md" -Raw

            if ($changelog -match "(?m)^## \[$([regex]::Escape($Version))\]") {
                Write-Info "CHANGELOG.md already has an entry for [$Version], skipping update"
            }
            # Insert new entry after header
            elseif ($changelog -match '(?s)(# Changelog.*?(?=## \[|\z))') {
                $header = $matches[1]
                $rest = $changelog.Substring($header.Length)

                # A pre-existing "## [Unreleased]" section holds notes added by commits
                # since the last release (see e.g. CHANGELOG.md's history of "log X in
                # Unreleased changelog" commits). Its content is about to ship as this
                # version, so drop the section here instead of leaving it behind as a
                # stale duplicate of what $changelogEntry (generated from the same
                # commits) now documents under the real version header.
                $rest = $rest -replace '(?ms)^## \[Unreleased\].*?(?=^## \[|\z)', ''

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
        if ((Test-Path $githubReleasePath) -and -not $ForceOverwrite) {
            Write-Info "Preserving existing GitHub release draft (curated): $githubReleasePath"
            Write-Info "Use -ForceOverwrite to regenerate generic release draft"
        } else {
            $githubRelease | Set-Content -Path $githubReleasePath -Encoding UTF8
            Write-Success "Created: $githubReleasePath"
        }

        # Also write to .github path so release workflow can pick it up automatically
        $notesPath = Join-Path ".github" "RELEASE_NOTES_v${Version}.md"
        if (-not (Test-Path ".github")) { New-Item -ItemType Directory -Path ".github" -Force | Out-Null }
        if ((Test-Path $notesPath) -and -not $ForceOverwrite) {
            Write-Info "Preserving existing workflow release notes (curated): $notesPath"
        } else {
            # Sanitize: remove fenced code blocks (just in case) by replacing triple backticks
            $sanitized = ($githubRelease -replace "```+", "")
            $sanitized | Set-Content -Path $notesPath -Encoding UTF8
            Write-Success "Created: $notesPath"
        }
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
