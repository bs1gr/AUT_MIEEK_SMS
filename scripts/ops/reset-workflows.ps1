<#
.SYNOPSIS
    Deletes all GitHub Actions workflow runs and retriggers CI pipelines.
.DESCRIPTION
    Uses GitHub CLI (gh) to delete all workflow history to clean up logs.
    Then pushes an empty commit to re-trigger all push-based workflows.
#>

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is required but not found."
    exit 1
}

do {
    Write-Host "Fetching workflow runs..." -ForegroundColor Cyan
    # Fetch IDs. Note: limit 1000 is max per call.
    $ids = gh run list --limit 1000 --json databaseId -q ".[].databaseId"

    if ($ids) {
        $count = if ($ids -is [array]) { $ids.Count } else { 1 }

        Write-Host "Found $count runs. Deleting..." -ForegroundColor Yellow

        $ids | ForEach-Object {
            try {
                gh run delete $_
                Write-Host "." -NoNewline
            } catch {
                Write-Host "x" -NoNewline
            }
        }
        Write-Host "`nBatch complete." -ForegroundColor Green
    } else {
        Write-Host "No more workflow runs found." -ForegroundColor Green
    }
} while ($ids)

Write-Host "Retriggering workflows via empty commit..." -ForegroundColor Cyan
git commit --allow-empty -m "chore: retrigger workflows"
git push

Write-Host "Done. Check Actions tab." -ForegroundColor Green
