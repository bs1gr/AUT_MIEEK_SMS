<#
.SYNOPSIS
    Deletes old GitHub Actions workflow runs and optionally retriggers CI pipelines.
.DESCRIPTION
    Uses GitHub CLI (gh) to delete workflow history to clean up logs.
    Defaults to keeping the last 5 runs for safety.
    Can optionally push an empty commit to re-trigger workflows.
#>

param(
    [int]$Keep = 5,
    [switch]$Retrigger,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is required but not found."
    exit 1
}

do {
    Write-Host "Fetching workflow runs..." -ForegroundColor Cyan
    # Fetch IDs. Note: limit 1000 is max per call. Returns sorted by created_at desc by default.
    $runs = gh run list --limit 1000 --json databaseId
    $ids = $runs | ConvertFrom-Json | Select-Object -ExpandProperty databaseId

    # Filter out current run if executing within GitHub Actions to prevent self-termination
    if ($ids -and $env:GITHUB_RUN_ID) {
        $ids = $ids | Where-Object { $_ -ne $env:GITHUB_RUN_ID }
    }

    # Apply safety filter (Keep N)
    if ($ids -and $ids.Count -gt $Keep) {
        $idsToDelete = $ids | Select-Object -Skip $Keep
        $count = $idsToDelete.Count

        Write-Host "Found $($ids.Count) total runs. Keeping top $Keep." -ForegroundColor Cyan
        Write-Host "Deleting $count old runs..." -ForegroundColor Yellow

        $idsToDelete | ForEach-Object {
            try {
                gh run delete $_
                Write-Host "." -NoNewline
            } catch {
                Write-Host "x" -NoNewline
            }
        }
        Write-Host "`nBatch complete." -ForegroundColor Green
    } elseif ($ids) {
        Write-Host "Found $($ids.Count) runs, which is within the keep limit ($Keep). No action taken." -ForegroundColor Green
        $ids = $null # Exit loop
    } else {
        Write-Host "No more workflow runs found." -ForegroundColor Green
    }
} while ($ids -and $ids.Count -gt $Keep)

if ($Retrigger) {
    Write-Host "Retriggering workflows via empty commit..." -ForegroundColor Cyan
    git commit --allow-empty -m "chore: retrigger workflows"
    git push
}

Write-Host "Done." -ForegroundColor Green
