#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pre-commit enforcement guard - the checkpoint COMMIT_READY.ps1 writes and the
    pre-commit hook checks.

.DESCRIPTION
    A successful COMMIT_READY run writes a checkpoint recording *what it validated*.
    The pre-commit hook then refuses the commit unless the content about to be committed
    is that same content.

    HISTORY - why this is bound to content instead of time:

    The checkpoint was originally valid for 45 minutes, then 90, and on 2026-01-31 the
    expiry was removed entirely because validations legitimately outlast any deadline and
    the false "expired" failures were worse than useless. But the check that remained
    ("does the file exist?") passes forever, for any content: one successful run, ever,
    unblocked every commit afterwards no matter what changed. The hook's own message still
    said "missing or expired" and its comment claimed it checked for freshness.

    Elapsed time was only ever a proxy for the real question - "has the code changed since
    it was validated?" - so that question is now asked directly. There is still no time
    limit: a checkpoint from last week is fine if the tree still matches it, and a
    checkpoint from a minute ago is refused if it does not.

.PARAMETER ValidateOnly
    Check the checkpoint against the current tree without writing one. Exit 0 = the commit
    may proceed, exit 1 = blocked. This is what the pre-commit hook runs.

.PARAMETER Mode
    Recorded in the checkpoint so the hook can report which mode validated (quick,
    standard, full). Informational only.

.PARAMETER Force
    Clear the checkpoint. The next commit is blocked until COMMIT_READY runs again.

.EXAMPLE
    # After a successful COMMIT_READY run (COMMIT_READY does this itself):
    .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1 -Mode quick

    # What the pre-commit hook runs:
    .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1 -ValidateOnly

.NOTES
    Emergency bypass: set SMS_COMMIT_READY_BYPASS=1 for a single commit. It is loud and
    deliberate, which is the point - it exists so that a stuck guard is never a reason to
    reach for `git commit --no-verify`, which skips the version-format check too.
#>

param(
    [switch]$ValidateOnly,
    [switch]$Force,
    [switch]$PrintFingerprint,
    [string]$Mode = ''
)

$ErrorActionPreference = 'Stop'

# Resolve the repo root from git, so the checkpoint is the same file no matter which
# directory the caller happens to be in. COMMIT_READY used to write it to the current
# directory while the hook (which git always runs from the repo root) looked elsewhere.
$repoRoot = $null
try {
    $repoRoot = (git rev-parse --show-toplevel 2>$null)
} catch {}
if (-not $repoRoot) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
$repoRoot = $repoRoot.Trim()
$CheckpointFile = Join-Path $repoRoot ".commit-ready-validated"

function Get-Sha256Hex {
    param([string]$Text)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
}

<#
    Fingerprint of everything that is not yet committed:
      - the HEAD commit, so a checkpoint does not survive a branch switch or a rebase
      - `git diff HEAD`, which covers tracked changes whether staged or not. Staging does
        not change this output, so `git add -A` between validating and committing is fine.
      - untracked, non-ignored files, hashed by content via a single `git hash-object`
        call, because those files become part of the commit as soon as they are added.
#>
function Get-TreeFingerprint {
    $head = ''
    try { $head = (git rev-parse HEAD 2>$null) } catch {}
    if ($head) { $head = $head.Trim() }

    $diff = ''
    if ($head) {
        try { $diff = (git diff HEAD 2>$null | Out-String) } catch {}
    } else {
        # No commits yet: there is no HEAD to diff against, so fall back to the status
        # listing. Slightly weaker, and only reachable in a fresh repo.
        try { $diff = (git status --porcelain -uall 2>$null | Out-String) } catch {}
    }

    $untracked = @()
    try {
        $untracked = @(git ls-files --others --exclude-standard 2>$null | Where-Object { $_ })
    } catch {}

    $untrackedPart = ''
    if ($untracked.Count -gt 0) {
        $hashes = @()
        try {
            # One call for all of them; git prints one hash per path, in order.
            $hashes = @(git hash-object -- $untracked 2>$null)
        } catch {}
        if ($hashes.Count -eq $untracked.Count) {
            for ($i = 0; $i -lt $untracked.Count; $i++) {
                $untrackedPart += "$($untracked[$i]) $($hashes[$i])`n"
            }
        } else {
            # Hashing failed (unreadable file, path length). Size + mtime still detects
            # an edit; record that this path was taken so a mismatch can be explained.
            $untrackedPart += "fallback-size-mtime`n"
            foreach ($path in $untracked) {
                $full = Join-Path $repoRoot $path
                if (Test-Path $full) {
                    $item = Get-Item -LiteralPath $full
                    $untrackedPart += "$path $($item.Length) $($item.LastWriteTimeUtc.Ticks)`n"
                } else {
                    $untrackedPart += "$path missing`n"
                }
            }
        }
    }

    # Paths only, without the porcelain status letters: staging a file changes " M path"
    # to "M  path", which would otherwise make every file look like a new one when the
    # mismatch report is printed.
    $changedPaths = @()
    try {
        $changedPaths = @(git status --porcelain 2>$null | Where-Object { $_ } | ForEach-Object {
            $entry = if ($_.Length -gt 3) { $_.Substring(3) } else { $_.Trim() }
            if ($entry -match ' -> ') { $entry = ($entry -split ' -> ')[-1] }   # renames
            $entry.Trim().Trim('"')
        } | Sort-Object -Unique)
    } catch {}

    return [pscustomobject]@{
        Head        = $head
        Fingerprint = Get-Sha256Hex "head:$head`n--diff--`n$diff`n--untracked--`n$untrackedPart"
        Files       = $changedPaths
        IsClean     = ($changedPaths.Count -eq 0)
    }
}

function Read-Checkpoint {
    if (-not (Test-Path $CheckpointFile)) { return $null }
    try {
        $raw = Get-Content $CheckpointFile -Raw
        if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
        return ($raw | ConvertFrom-Json)
    } catch {
        # An unreadable checkpoint is treated as no checkpoint: better to re-validate than
        # to guess what it meant.
        return $null
    }
}

function New-ValidationCheckpoint {
    $state = Get-TreeFingerprint
    $payload = [ordered]@{
        validatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        mode        = $Mode
        head        = $state.Head
        fingerprint = $state.Fingerprint
        fileCount   = $state.Files.Count
        files       = @($state.Files | Select-Object -First 200)
    }
    Set-Content -Path $CheckpointFile -Value ($payload | ConvertTo-Json -Depth 4) -Force
    Write-Host "✅ Validation checkpoint written" -ForegroundColor Green
    Write-Host "   Covers $($state.Files.Count) changed file(s) at $($payload.validatedAt)" -ForegroundColor Green
    Write-Host "   Valid until those files change - there is no time limit" -ForegroundColor Green
}

function Test-CheckpointValidity {
    if ($env:SMS_COMMIT_READY_BYPASS -in @('1', 'true', 'yes')) {
        Write-Host "⚠️  SMS_COMMIT_READY_BYPASS is set - committing WITHOUT validation" -ForegroundColor Yellow
        Write-Host "   Nothing has been checked. You are responsible for this commit." -ForegroundColor Yellow
        return $true
    }

    $checkpoint = Read-Checkpoint
    if ($null -eq $checkpoint) {
        Write-Host "❌ COMMIT BLOCKED: no usable validation checkpoint" -ForegroundColor Red
        Write-Host "   Run: pwsh -File .\infra\scripts\ops\COMMIT_READY.ps1 -Quick" -ForegroundColor Yellow
        return $false
    }

    $state = Get-TreeFingerprint

    if ($state.Fingerprint -eq $checkpoint.fingerprint) {
        $modeText = if ($checkpoint.mode) { " ($($checkpoint.mode) mode)" } else { "" }
        Write-Host "✅ Checkpoint matches the content being committed$modeText" -ForegroundColor Green
        Write-Host "   Validated $($checkpoint.validatedAt)" -ForegroundColor DarkGray
        return $true
    }

    # Nothing uncommitted means there is nothing for the gate to have validated - an
    # amend, an empty commit, a merge. Blocking these would only push people toward
    # --no-verify, which also skips the version-format check.
    if ($state.IsClean) {
        Write-Host "✅ Working tree is clean - no unvalidated content in this commit" -ForegroundColor Green
        return $true
    }

    Write-Host "❌ COMMIT BLOCKED: the code changed after it was validated" -ForegroundColor Red
    Write-Host "   Checkpoint: $($checkpoint.validatedAt), $($checkpoint.fileCount) file(s)" -ForegroundColor Yellow
    Write-Host "   Now:        $($state.Files.Count) file(s) changed" -ForegroundColor Yellow

    $was = @($checkpoint.files)
    $now = @($state.Files)
    $added = @($now | Where-Object { $_ -notin $was })
    $gone = @($was | Where-Object { $_ -notin $now })
    if ($added.Count -gt 0) {
        Write-Host "   Not in the validated set:" -ForegroundColor Yellow
        $added | Select-Object -First 10 | ForEach-Object { Write-Host "     + $_" -ForegroundColor Yellow }
        if ($added.Count -gt 10) { Write-Host "     ... and $($added.Count - 10) more" -ForegroundColor Yellow }
    }
    if ($gone.Count -gt 0) {
        Write-Host "   Validated but no longer changed:" -ForegroundColor DarkGray
        $gone | Select-Object -First 10 | ForEach-Object { Write-Host "     - $_" -ForegroundColor DarkGray }
    }
    if ($added.Count -eq 0 -and $gone.Count -eq 0) {
        Write-Host "   Same file list, different contents - a file was edited after validation." -ForegroundColor Yellow
    }

    Write-Host "   Re-run: pwsh -File .\infra\scripts\ops\COMMIT_READY.ps1 -Quick" -ForegroundColor Yellow
    return $false
}

# Main logic
if ($Force) {
    Write-Host "⚠️  Clearing validation checkpoint" -ForegroundColor Yellow
    if (Test-Path $CheckpointFile) {
        Remove-Item $CheckpointFile -Force
        Write-Host "   Cleared. The next commit is blocked until COMMIT_READY runs again." -ForegroundColor Yellow
    }
    exit 0
}

if ($PrintFingerprint) {
    # Used by COMMIT_READY to notice files changing while the gate is running: the
    # checkpoint is taken at the end of the run, so an edit made mid-run would otherwise
    # be blessed without having been linted or tested.
    Write-Output (Get-TreeFingerprint).Fingerprint
    exit 0
}

if ($ValidateOnly) {
    $isValid = Test-CheckpointValidity
    exit ($isValid ? 0 : 1)
}

# Default: record a new checkpoint (called by COMMIT_READY after a successful run)
New-ValidationCheckpoint
exit 0
