<#
.SYNOPSIS
    Marks legacy GitHub releases as archived and prepends a warning message to their notes.

.DESCRIPTION
    This helper automates the GitHub-side cleanup required by the v1.6.3 release process.
    It looks up all releases for the specified repository, compares their semantic version
    (assumes tags such as v1.6.2), and for every release whose version is less than or equal
    to the provided ThresholdTag it:
        * prepends an ARCHIVED notice that points back to the repo's archive/ directory
        * toggles the release to "pre-release" status so it no longer appears as the latest
    The script uses the GitHub CLI (`gh`) under the hood and supports a -DryRun switch so you
    can preview the operations before mutating anything.

.EXAMPLE
    pwsh scripts/ops/archive-releases.ps1 -Repo "bs1gr/AUT_MIEEK_SMS" -ThresholdTag "v1.6.2"

.EXAMPLE
    pwsh scripts/ops/archive-releases.ps1 -DryRun | Format-Table

.PARAMETER Repo
    GitHub repository in the form owner/name. Defaults to bs1gr/AUT_MIEEK_SMS.

.PARAMETER ThresholdTag
    Highest tag that should be archived. Any release with a semantic version less than or
    equal to this value will be updated.

.PARAMETER ArchiveHeading
    Heading inserted at the very top of the release body.

.PARAMETER ArchiveDetail
    Detail paragraph inserted directly after the heading. You can embed URLs.

.PARAMETER ReleasesJsonPath
    Optional path to a local JSON file (matching the GitHub releases API schema) used for
    offline testing. When provided, the script skips calling `gh api` and reads releases
    from the supplied file instead.

.PARAMETER GhPath
    Path or name of the GitHub CLI executable. Use when `gh` is not discoverable via PATH.

.PARAMETER DryRun
    When set, the script only reports what it would change.

.PARAMETER SkipPrereleaseToggle
    When set, the script will not toggle the matching releases into pre-release status.

.NOTES
    Requirements: GitHub CLI (`gh`) authenticated with permission to edit releases.
    Date: 2025-11-15
#>
param(
    [Parameter()][string]$Repo = "bs1gr/AUT_MIEEK_SMS",
    [Parameter()][string]$ThresholdTag = "v1.6.2",
    [Parameter()][string]$ArchiveHeading = "**ARCHIVED – Legacy release**",
    [Parameter()][string]$ArchiveDetail = "Deprecated since v1.6.3. All setup/stop wrappers now live under archive/ for historical reference only.",
    [Parameter()][string]$ReleasesJsonPath,
    [Parameter()][string]$GhPath,
    [switch]$DryRun,
    [switch]$SkipPrereleaseToggle
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:GhExecutable = $null

function Resolve-GhCommand {
    param()
    if ($script:GhExecutable) {
        return
    }
    if ($GhPath) {
        $resolved = Get-Command $GhPath -ErrorAction Stop
    }
    else {
        $resolved = Get-Command gh -ErrorAction SilentlyContinue
    }
    if (-not $resolved) {
        throw "GitHub CLI (gh) is required. Install it from https://cli.github.com/ and ensure it is authenticated."
    }
    $script:GhExecutable = $resolved.Source
}

function Invoke-Gh {
    param([string[]]$Arguments)
    Resolve-GhCommand
    & $script:GhExecutable @Arguments
}

function Get-VersionFromTag {
    param([string]$Tag)
    if ([string]::IsNullOrWhiteSpace($Tag)) {
        return $null
    }
    $clean = $Tag.Trim()
    if ($clean.StartsWith('v', [StringComparison]::OrdinalIgnoreCase)) {
        $clean = $clean.Substring(1)
    }
    try {
        return [version]$clean
    }
    catch {
        Write-Verbose "Skipping tag '$Tag' because it is not semantic-version compatible."
        return $null
    }
}

$thresholdVersion = Get-VersionFromTag -Tag $ThresholdTag
if (-not $thresholdVersion) {
    throw "ThresholdTag '$ThresholdTag' could not be parsed as a semantic version."
}

function Get-ReleasesData {
    if ($ReleasesJsonPath) {
        if (-not (Test-Path -LiteralPath $ReleasesJsonPath)) {
            throw "ReleasesJsonPath '$ReleasesJsonPath' does not exist."
        }
        $json = Get-Content -LiteralPath $ReleasesJsonPath -Raw -Encoding UTF8
        return $json | ConvertFrom-Json
    }

    Write-Host "Fetching releases from $Repo ..."
    $page = 1
    $all = @()
    while ($true) {
        $payload = Invoke-Gh -Arguments @('api', "/repos/$Repo/releases?per_page=100&page=$page")
        if (-not $payload) { break }
        $batch = $payload | ConvertFrom-Json
        if ($null -eq $batch) { break }
        if ($batch -isnot [System.Collections.IEnumerable]) {
            $batch = @($batch)
        }
        $all += $batch
        if ($batch.Count -lt 100) { break }
        $page += 1
    }
    return $all
}

$releases = Get-ReleasesData
if ($null -eq $releases) {
    throw "No releases were returned for $Repo."
}
if ($releases -isnot [System.Collections.IEnumerable]) {
    $releases = @($releases)
}

$updates = @()
foreach ($release in $releases) {
    $tag = $release.tag_name
    $releaseVersion = Get-VersionFromTag -Tag $tag
    if (-not $releaseVersion) {
        continue
    }
    if ($releaseVersion -le $thresholdVersion) {
        $needsBodyUpdate = $true
        if ($release.body -and $release.body.TrimStart().StartsWith($ArchiveHeading)) {
            $needsBodyUpdate = $false
        }
        $needsPrereleaseToggle = -not $SkipPrereleaseToggle.IsPresent -and -not $release.prerelease
        $updates += [pscustomobject]@{
            Tag                   = $tag
            Version               = $releaseVersion.ToString()
            NeedsBodyUpdate       = $needsBodyUpdate
            NeedsPrereleaseToggle = $needsPrereleaseToggle
        }

        if ($DryRun) {
            continue
        }

        $newBody = $release.body
        if ($needsBodyUpdate) {
            $existing = $release.body
            if (-not $existing) {
                $existing = ""
            }
            $newBody = "{0}`n`n{1}`n`n{2}" -f $ArchiveHeading, $ArchiveDetail, $existing.Trim()
        }

        $noteFile = [System.IO.Path]::GetTempFileName()
        try {
            Set-Content -Path $noteFile -Value $newBody -Encoding UTF8
            $ghArgs = @('release', 'edit', $tag, '--notes-file', $noteFile)
            if ($needsPrereleaseToggle) {
                $ghArgs += '--prerelease'
            }
            if ($needsBodyUpdate -or $needsPrereleaseToggle) {
                Write-Host "Updating $tag ..."
                Invoke-Gh -Arguments $ghArgs | Out-Null
            }
            else {
                Write-Host "No changes required for $tag."
            }
        }
        finally {
            Remove-Item -LiteralPath $noteFile -ErrorAction SilentlyContinue
        }
    }
}

if (-not $updates) {
    Write-Host "No releases met the criteria (<= $ThresholdTag)."
    return
}

if ($DryRun) {
    Write-Host "Dry run complete. Use the following table to see pending changes:" -ForegroundColor Yellow
    $updates | Format-Table -AutoSize
}
else {
    Write-Host "Completed updates for the following releases:" -ForegroundColor Green
    $updates | Format-Table -AutoSize
}
