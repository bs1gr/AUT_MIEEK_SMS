<#
PowerShell cleanup helper for this repository.
Safe, non-destructive steps:
 - Ensures `.gitignore` contains ignore rules for temporary CI/local artifact folders
 - Refuses to delete anything if matching files are currently tracked by git (prints them and exits non-zero)
 - Removes local directories named `tmp_artifacts*` and `tmp_*` (untracked by git)
 - Commits a small .gitignore change if it was updated (so developers don't accidentally re-add these files)

Usage (from repo root - Pwsh):
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\clean_tmp_artifacts.ps1

This script is intentionally conservative. It will never untrack or remove files that are tracked by git.
#>
[CmdletBinding()]
param()

function Write-ErrAndExit($msg, $code=1){ Write-Host $msg; exit $code }

# patterns to protect / remove
$protectPatterns = @('tmp_artifacts*','tmp_*')
$gitRoot = (git rev-parse --show-toplevel) -replace '\\','\\'
if (-not $gitRoot) { Write-Host "Not a git repository (git rev-parse failed). Exiting."; exit 1 }
Set-Location $gitRoot

Write-Host "Repository root: $gitRoot"

# 1) Check for tracked files matching patterns
$tracked = @()
foreach ($p in $protectPatterns) {
    try {
        $out = git ls-files -- "${p}" 2>$null | Where-Object { $_ -ne '' }
        if ($out) { $tracked += $out }
    } catch {
        # ignore
    }
}

if ($tracked.Count -gt 0) {
    Write-Host "Found tracked files that match cleanup patterns. Aborting to avoid destructive changes."
    $tracked | ForEach-Object { Write-Host "  $($_)" }
    Write-Host "To proceed, first untrack these files (example):"
    Write-Host "  git rm --cached <file> && git commit -m 'chore: untrack generated artifact'"
    exit 2
}

# 2) Ensure .gitignore contains safe entries
$gitignorePath = Join-Path $gitRoot '.gitignore'
$needIgnoreEntries = @('tmp_artifacts/','tmp_artifacts*','tmp_*')
$missing = @()
if (-Not (Test-Path $gitignorePath)) {
    Write-Host ".gitignore not found; creating a new one at $gitignorePath"
    New-Item -Path $gitignorePath -ItemType File -Force | Out-Null
}

foreach ($entry in $needIgnoreEntries) {
    $found = Select-String -Path $gitignorePath -Pattern ([regex]::Escape($entry)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
    if (-not $found) { $missing += $entry }
}

if ($missing.Count -gt 0) {
    Write-Host "Appending missing ignore entries to .gitignore:"
    $missing | ForEach-Object { Write-Host "  $_" }
    Add-Content -Path $gitignorePath -Value "`n# Temporary CI/local artifact folders"
    foreach ($m in $missing) { Add-Content -Path $gitignorePath -Value $m }
    try {
        git add .gitignore
        git commit -m "chore: ignore temporary CI artifact folders (tmp_artifacts*, tmp_*)" | Out-Null
        Write-Host "Committed .gitignore update"
    } catch {
        Write-Host "Unable to commit .gitignore update (this may be a detached HEAD or no user.email configured). The file was updated locally."
    }
} else {
    Write-Host ".gitignore already contains required entries."
}

# 3) Remove untracked tmp artifact directories
$removed = 0
$patternsToRemove = @('tmp_artifacts*','tmp_*')
foreach ($pat in $patternsToRemove) {
    $dirs = Get-ChildItem -Path $gitRoot -Directory -Filter $pat -ErrorAction SilentlyContinue
    foreach ($d in $dirs) {
        try {
            Write-Host "Removing directory: $($d.FullName)"
            Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction Stop
            $removed++
        } catch {
            Write-Host "Failed to remove $($d.FullName): $_"
        }
    }
}

if ($removed -eq 0) { Write-Host "No untracked tmp artifact directories found to remove." } else { Write-Host "Removed $removed tmp artifact directories." }

Write-Host "Cleanup script finished successfully."; exit 0
