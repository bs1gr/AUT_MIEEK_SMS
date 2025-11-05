# Remove only the artifact dirs and log files reported by git status
$porcelain = git status --porcelain 2>$null
if (-not $porcelain) { Write-Host "No untracked items from git status."; exit 0 }
foreach ($line in $porcelain) {
    if ($line -match '^\?\?\s+(.+)$') {
        $path = $matches[1]
        if ($path -like 'artifacts_run_*' -or $path -like 'run*.log' -or $path -like 'run_*.log') {
            if (Test-Path -LiteralPath $path) {
                Write-Host "Removing: $path"
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
            } else {
                Write-Host "Path not found (skipping): $path"
            }
        } else {
            Write-Host "Skipping untracked (not an artifact): $path"
        }
    }
}
Write-Host "Cleanup complete."
