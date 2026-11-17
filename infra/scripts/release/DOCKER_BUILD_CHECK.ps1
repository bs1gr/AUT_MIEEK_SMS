#Requires -Version 7.0
<#
.SYNOPSIS
    Makes sure the Docker image builds from the commit that is about to be tagged.

.DESCRIPTION
    Plan todo 48. CI builds Dockerfile.fullstack on every push, for amd64 only. The cloud host
    is arm64 and builds the image itself, after the tag: an image that does not build there
    showed on the VM, with the release already published.

    This script asks GitHub Actions for a build-only run of docker-publish.yml (dry_run=true:
    nothing is pushed to a registry, nothing is published) of HEAD, and reports how it ended.

      * HEAD has to be what origin/<current branch> points at. A dispatch builds the branch as
        it is on GitHub, so an unpushed commit would be "checked" by a build of something else.
      * A build-only run of this commit, for the same platforms, that already succeeded is the
        answer: nothing is dispatched. One that is still running is waited for. A new run is
        dispatched only when there is none, or when the last one did not succeed.
      * Runs are recognised by their commit and by the title the workflow gives them:
        "Docker build check <tag> (<platforms>)".

    Exit code 0: a build-only run of HEAD succeeded (with -NoWait: one is under way).
    Exit code 1: anything else; the reason is printed.

.PARAMETER Version
    The release being prepared, "1.18.73" or "v1.18.73". It only labels the run: a build-only
    run builds the dispatched commit, and the tag does not have to exist yet.

.PARAMETER Platforms
    linux/amd64, linux/arm64 or both (the default; arm64 is built under emulation).

.PARAMETER NoWait
    Start the run (or find the one already there) and return without waiting for its result.

.PARAMETER TimeoutMinutes
    How long to wait for the run to finish (default 30; both platforms took under 10).

.PARAMETER PollSeconds
    Seconds between two looks at the run (default 20).

.PARAMETER AppearSeconds
    How long a dispatched run may take to show up in the run list (default 120).

.PARAMETER RepoRoot
    The repository to check. Defaults to the one this script is in.

.EXAMPLE
    .\infra\scripts\release\DOCKER_BUILD_CHECK.ps1 -Version 1.18.73
    # Before a tag made by hand: exit code 0 means the image builds from HEAD.

.EXAMPLE
    .\infra\scripts\release\DOCKER_BUILD_CHECK.ps1 -Version 1.18.73 -NoWait
    # Start the run now, read its result later with the first form.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string[]]$Platforms = @('linux/amd64', 'linux/arm64'),
    [switch]$NoWait,
    [int]$TimeoutMinutes = 30,
    [int]$PollSeconds = 20,
    [int]$AppearSeconds = 120,
    [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$Workflow = 'docker-publish.yml'
$KnownPlatforms = @('linux/amd64', 'linux/arm64')
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path }

function Write-Step([string]$Message, [string]$Color = 'Gray') {
    Write-Host "[docker-check] $Message" -ForegroundColor $Color
}

function Get-BuildCheckRuns {
    # The build-only runs of this commit with this title, newest first.
    param([string]$Sha, [string]$Title)

    $json = gh run list --workflow $Workflow --event workflow_dispatch --commit $Sha --limit 30 `
        --json 'databaseId,displayTitle,status,conclusion,url'
    if ($LASTEXITCODE -ne 0) {
        throw "gh run list failed (exit $LASTEXITCODE). Is gh signed in? Try: gh auth status"
    }
    $found = @()
    foreach ($run in @(($json -join "`n") | ConvertFrom-Json)) {
        if ($run -and $run.displayTitle -eq $Title) { $found += $run }
    }
    return , @($found | Sort-Object -Property { [long]$_.databaseId } -Descending)
}

function Invoke-BuildCheck {
    if ($Version -notmatch '^v?(1\.\d+\.\d+)$') {
        throw "Version '$Version' is not in the 1.x.x format."
    }
    $core = $Matches[1]
    $tag = "v$core"

    # "-Platforms a,b" arrives as two values, "-Platforms 'a,b'" (and -File) as one.
    $asked = @(($Platforms -join ',') -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $unknown = @($asked | Where-Object { $_ -notin $KnownPlatforms })
    if ($unknown.Count -gt 0 -or $asked.Count -eq 0) {
        throw "Platforms must be linux/amd64, linux/arm64 or both; got '$($Platforms -join ',')'."
    }
    # The workflow's input is a choice: the order is fixed.
    $platformText = @($KnownPlatforms | Where-Object { $_ -in $asked }) -join ','

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'The GitHub CLI (gh) is not on PATH.'
    }

    $sha = "$(git rev-parse HEAD)".Trim()
    if ($LASTEXITCODE -ne 0 -or -not $sha) { throw "Not a git repository: $RepoRoot" }
    $short = $sha.Substring(0, 9)
    $branch = "$(git rev-parse --abbrev-ref HEAD)".Trim()
    if ($branch -eq 'HEAD') {
        throw 'HEAD is detached. Check out the branch that will be tagged: a run is dispatched on a branch.'
    }
    $remoteLine = "$(git ls-remote origin "refs/heads/$branch")".Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not ask origin about '$branch' (git ls-remote failed)." }
    $remoteSha = ($remoteLine -split '\s+')[0]
    if ($remoteSha -ne $sha) {
        $there = if ($remoteSha) { $remoteSha.Substring(0, 9) } else { 'no such branch' }
        throw "HEAD ($short) is not what origin/$branch points at ($there). Push first: the run builds the branch as it is on GitHub."
    }

    $title = "Docker build check $tag ($platformText)"
    Write-Step "Commit $short on '$branch': $title"

    $runs = Get-BuildCheckRuns -Sha $sha -Title $title
    $passed = $runs | Where-Object { $_.status -eq 'completed' -and $_.conclusion -eq 'success' } | Select-Object -First 1
    if ($passed) {
        Write-Step "A build-only run of this commit already succeeded: $($passed.url)" 'Green'
        return
    }

    $run = $runs | Where-Object { $_.status -ne 'completed' } | Select-Object -First 1
    if ($run) {
        Write-Step "A build-only run of this commit is under way: $($run.url)"
    }
    else {
        $known = @($runs | ForEach-Object { "$($_.databaseId)" })
        if ($known.Count -gt 0) {
            Write-Step "The last build-only run of this commit ended with '$($runs[0].conclusion)'; starting another."
        }
        Write-Step "Dispatching $Workflow on '$branch' (dry_run=true, platforms=$platformText)..."
        $null = gh workflow run $Workflow --ref $branch -f "tag=$tag" -f 'dry_run=true' -f "platforms=$platformText"
        if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed (exit $LASTEXITCODE)." }

        $appearBy = (Get-Date).AddSeconds($AppearSeconds)
        while (-not $run) {
            Start-Sleep -Seconds ([Math]::Min($PollSeconds, 5))
            $now = Get-BuildCheckRuns -Sha $sha -Title $title
            $run = $now | Where-Object { "$($_.databaseId)" -notin $known } | Select-Object -First 1
            if (-not $run -and (Get-Date) -ge $appearBy) {
                throw "The run was dispatched but did not show up for commit $short within $AppearSeconds seconds. If '$branch' moved on GitHub meanwhile, it built another commit. See: gh run list --workflow $Workflow"
            }
        }
        Write-Step "Started: $($run.url)"
    }

    if ($NoWait) {
        # The command that reads this run's result: the same platforms, or it asks for another run.
        $again = "DOCKER_BUILD_CHECK.ps1 -Version $core"
        if ($platformText -ne ($KnownPlatforms -join ',')) { $again += " -Platforms '$platformText'" }
        Write-Step "Not waiting (-NoWait). For the result, before the tag: $again" 'Yellow'
        return
    }

    $started = Get-Date
    $giveUpAt = $started.AddMinutes($TimeoutMinutes)
    $failedLooks = 0
    $lastStatus = $run.status
    $state = $null
    while ($true) {
        $json = gh run view $run.databaseId --json 'status,conclusion,url,jobs'
        if ($LASTEXITCODE -ne 0) {
            # One look that fails (the network, GitHub) is not the build failing.
            $failedLooks++
            if ($failedLooks -ge 5) { throw "gh run view failed five times in a row. The run: $($run.url)" }
        }
        else {
            $failedLooks = 0
            $state = ($json -join "`n") | ConvertFrom-Json
            if ($state.status -eq 'completed') { break }
            if ($state.status -ne $lastStatus) {
                Write-Step "The run is $($state.status)..."
                $lastStatus = $state.status
            }
        }
        if ((Get-Date) -ge $giveUpAt) {
            throw "The run is still '$lastStatus' after $TimeoutMinutes minutes: $($run.url)"
        }
        Start-Sleep -Seconds $PollSeconds
    }

    if ($state.conclusion -ne 'success') {
        foreach ($job in @($state.jobs)) {
            foreach ($step in @($job.steps)) {
                if ($step.conclusion -eq 'failure') { Write-Step "Failed step: $($job.name) / $($step.name)" 'Red' }
            }
        }
        throw "The build-only run ended with '$($state.conclusion)': $($run.url)"
    }
    $minutes = [Math]::Round(((Get-Date) - $started).TotalMinutes, 1)
    Write-Step "The image builds from $short for $platformText (waited $minutes min): $($run.url)" 'Green'
}

$exitCode = 0
Push-Location $RepoRoot
try {
    Invoke-BuildCheck | Out-Null
}
catch {
    Write-Step "NOT PASSED: $($_.Exception.Message)" 'Red'
    $exitCode = 1
}
finally {
    Pop-Location
}
exit $exitCode
