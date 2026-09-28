<#
.SYNOPSIS
    Verify and record current workspace state to prevent data loss.

.DESCRIPTION
    Creates a timestamped Markdown report under artifacts/state capturing:
    - Version info and quick validation
    - Git branch, commit, status (staged/unstaged/untracked)
    - Pre-commit quick validation (COMMIT_READY -Quick), unless -SkipCommitReady
    - Test results summary (existing artifacts only)
    - Backups inventory (latest file)
    - Environment file presence
    - Latest Alembic migration files (not executed)

.PARAMETER SkipCommitReady
    Don't run COMMIT_READY. COMMIT_READY -Snapshot passes this: it has just validated, and
    re-running it here would repeat the whole quick gate (backend tests included).

.NOTES
    Safe to run anytime. Does NOT run tests itself; COMMIT_READY -Quick (when run) does.
#>

param(
    [Parameter()][switch]$VerboseMode,
    [Parameter()][switch]$SkipCommitReady
)

$ErrorActionPreference = 'Continue'

function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# Detect admin mode and warn (may cause hangs)
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin -and -not $SkipCommitReady) {
    Write-Warn "Running as Administrator - COMMIT_READY calls may hang"
    Write-Info "Timeout protection enabled (15-minute max for validation)"
}

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$Timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$StateDir = Join-Path $ROOT 'artifacts\state'
if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }

$ReportPath = Join-Path $StateDir "STATE_${Timestamp}.md"
$CommitReadyLog = Join-Path $StateDir "COMMIT_READY_${Timestamp}.log"

function Append($text) { Add-Content -Path $ReportPath -Value $text -Encoding UTF8 }
function Section($title) {
    Append "`n## $title`n"
}

# Header
Append "# Workspace State Snapshot"
Append "`nGenerated: $((Get-Date).ToString('u'))"

# Version
Section 'version'
try {
    $versionFile = Join-Path $ROOT 'VERSION'
    if (Test-Path $versionFile) {
        $version = (Get-Content $versionFile -Raw).Trim()
        Append ("- VERSION: $version")
        # Quick CI-mode check (VERSION vs frontend/package.json)
        $verifyScript = Join-Path $ROOT 'scripts\VERIFY_VERSION.ps1'
        if (Test-Path $verifyScript) {
            Append ("- Running quick version validation (CI mode)...")
            $ciOut = & pwsh -NoProfile -ExecutionPolicy Bypass -File $verifyScript -CIMode 2>&1
            if ($LASTEXITCODE -eq 0) {
                Append ("  - Result: OK")
            } else {
                Append ("  - Result: FAILED")
                Append ("  - Output:")
                Append ($ciOut | Out-String)
            }
        } else {
            Append ("- VERIFY_VERSION.ps1 not found (skipping CI-mode check)")
        }
    } else {
        Append ("- VERSION file missing")
    }
} catch { Append ("- Error reading VERSION: $($_.Exception.Message)") }

# Git status
Section 'git status'
try {
    Push-Location $ROOT
    $branch = (git branch --show-current) 2>$null
    $commit = (git rev-parse HEAD) 2>$null
    $subject = (git log -1 --format=%s) 2>$null
    $remote = (git remote -v) 2>$null
    $porcelain = (git status --porcelain=v1) 2>$null
    $unpushed = (git log --oneline '@{u}..HEAD') 2>$null
    Append ("- Branch: $branch")
    Append ("- Commit: $commit ($subject)")
    if ($LASTEXITCODE -eq 0) {
        if ($unpushed) {
            Append ('- Unpushed commits:')
            Append ('```' + [Environment]::NewLine + ($unpushed | Out-String) + '```')
        } else {
            Append ('- Unpushed commits: none')
        }
    }
    Append ("- Remote:")
    Append ('```' + [Environment]::NewLine + ($remote | Out-String) + '```')
    if ($porcelain) {
        Append ('- Changes:')
        Append ('```' + [Environment]::NewLine + ($porcelain | Out-String) + '```')
    } else {
        Append ('- Changes: none')
    }
    Pop-Location
} catch { Append ("- Error collecting git status: $($_.Exception.Message)") }

# COMMIT_READY quick validation
Section 'pre-commit quick validation'
try {
    $commitReady = Join-Path $ROOT 'infra\scripts\ops\COMMIT_READY.ps1'
    if ($SkipCommitReady) {
        Append ("- Skipped (-SkipCommitReady). COMMIT_READY -Snapshot passes this because its own run is the validation.")
    } elseif (Test-Path $commitReady) {
        # The quick gate runs the backend batch tests, so it routinely takes 5-10 minutes.
        $timeout = 900
        Append ("- Running COMMIT_READY -Quick (capturing to log, $([int]($timeout / 60))-minute timeout)")

        $job = Start-Job -ScriptBlock {
            param($script, $root)
            Set-Location $root
            & pwsh -NoProfile -ExecutionPolicy Bypass -File $script -Quick 2>&1
            "__EXIT_CODE__=$LASTEXITCODE"
        } -ArgumentList $commitReady, $ROOT

        $completed = Wait-Job -Job $job -Timeout $timeout

        if ($completed) {
            $output = Receive-Job -Job $job
            Remove-Job -Job $job -Force
            $exitLine = $output | Where-Object { "$_" -like '__EXIT_CODE__=*' } | Select-Object -Last 1
            $exitCode = if ($exitLine) { [int]("$exitLine" -replace '^__EXIT_CODE__=', '') } else { -1 }
            $output | Where-Object { "$_" -notlike '__EXIT_CODE__=*' } | Out-File -FilePath $CommitReadyLog -Encoding UTF8

            $ready = @($output | Select-String -Pattern 'READY TO COMMIT' -SimpleMatch).Count -gt 0
            Append ("- Log: $(Split-Path -Leaf $CommitReadyLog)")
            Append ("- Exit code: $exitCode")
            Append ("- Result: " + $(if ($exitCode -eq 0 -and $ready) { 'PASSED (ready to commit)' } else { 'FAILED - see log' }))
            # Leading status glyphs (✓/✗) come back as '?' through the job's console encoding; drop them.
            $summary = $output | Select-String -CaseSensitive -Pattern '^\W*(Passed|Failed): +\d+$|READY TO COMMIT|Linting: \d|Tests: \d'
            if ($summary) {
                $lines = $summary | ForEach-Object { ($_.Line -replace '^[^A-Za-z\[]+', '').Trim() }
                Append ("- Summary:" + [Environment]::NewLine + '```' + [Environment]::NewLine + ($lines -join [Environment]::NewLine) + [Environment]::NewLine + '```')
            }
        } else {
            Stop-Job -Job $job
            Remove-Job -Job $job -Force
            Append ("- TIMEOUT: COMMIT_READY did not complete in $timeout seconds")
            Append ("- This often happens when VS Code runs as Administrator")
            Append ("- Skipping validation output")
        }
    } else {
        Append ("- COMMIT_READY.ps1 not found at $commitReady")
    }
} catch { Append ("- Error running COMMIT_READY: $($_.Exception.Message)") }

# Test results summary (non-invasive)
Section 'test results summary (existing artifacts)'
try {
    $backendFull = Join-Path $ROOT 'src\backend\test-results\backend_batch_full.txt'
    if (Test-Path $backendFull) {
        $content = Get-Content $backendFull -Raw
        $passedBatches = ([regex]::Matches($content, 'Batch \d+ completed successfully')).Count
        $failedBatches = ([regex]::Matches($content, 'Batch \d+ failed')).Count
        Append ("- Backend batch results: $((Get-Item $backendFull).LastWriteTime.ToString('u'))")
        Append ("- Batches passed: $passedBatches")
        Append ("- Batches failed: $failedBatches")
        # The summary prints a batch block and then a test block, each starting with "Total:";
        # the last one is the per-test count.
        $lastTotal = $content.LastIndexOf('Total:')
        if ($lastTotal -ge 0) {
            $totals = [regex]::Matches($content.Substring($lastTotal), '(Total|Passed|Failed|Skipped):\s+\d+') |
                ForEach-Object { $_.Value -replace '\s+', ' ' }
            if ($totals) { Append ("- Tests: " + ($totals -join ', ')) }
        }
    } else {
        Append ("- Backend batch results not found (run infra\scripts\testing\RUN_TESTS_BATCH.ps1 to generate)")
    }
    $e2eLastRun = Join-Path $ROOT 'src\frontend\test-results\.last-run.json'
    if (Test-Path $e2eLastRun) {
        try {
            $e2e = Get-Content $e2eLastRun -Raw | ConvertFrom-Json
            $failedCount = @($e2e.failedTests).Count
            Append ("- E2E (Playwright) last run: $($e2e.status), $failedCount failed test(s), at $((Get-Item $e2eLastRun).LastWriteTime.ToString('u'))")
        } catch {
            Append ("- E2E (Playwright) last run file present but unreadable")
        }
    } else {
        Append ("- E2E (Playwright) last run: not found")
    }
} catch { Append ("- Error reading test artifacts: $($_.Exception.Message)") }

# Backups inventory
Section 'backups inventory'
try {
    $backupsDir = Join-Path $ROOT 'backups'
    if (Test-Path $backupsDir) {
        $files = @(Get-ChildItem $backupsDir -File | Where-Object { -not $_.Name.StartsWith('.') } | Sort-Object LastWriteTime -Descending)
        if ($files.Count -gt 0) {
            $latest = $files[0]
            Append ("- Latest backup: $($latest.Name) ($([Math]::Round($latest.Length/1MB,2)) MB) at $($latest.LastWriteTime.ToString('u'))")
        } else {
            Append ('- No backup files found')
        }
    } else {
        Append ('- Backups directory not found')
    }
    Append ('- Note: the running app writes backups to settings.BACKUPS_DIR, which may be elsewhere')
} catch { Append ("- Error listing backups: $($_.Exception.Message)") }

# Environment files presence (never their contents)
Section 'environment files'
try {
    foreach ($rel in @('src\backend\.env', 'src\frontend\.env', 'config\.env', 'src\backend\data\smtp_override.json')) {
        Append ("- ${rel}: $(if (Test-Path (Join-Path $ROOT $rel)) { 'present' } else { 'missing' })")
    }
} catch { Append "- Error checking env files: $($_.Exception.Message)" }

# Alembic/migrations (non-executing)
Section 'migrations overview (non-executing)'
try {
    $migrationsDir = Join-Path $ROOT 'src\backend\migrations\versions'
    if (Test-Path $migrationsDir) {
        $mig = Get-ChildItem $migrationsDir -Filter '*.py' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 3
        Append ('- Latest migration files:')
        foreach ($m in $mig) { Append ("  - $($m.Name) ($($m.LastWriteTime.ToString('u')))" ) }
    } else {
        Append ("- Migrations directory not found: $migrationsDir")
    }
} catch { Append ("- Error reviewing migrations: $($_.Exception.Message)") }

# Footer
Append "`n---`nReport path: $ReportPath"
Write-Ok "State snapshot saved: $ReportPath"
if (Test-Path $CommitReadyLog) { Write-Ok "COMMIT_READY log saved: $CommitReadyLog" }
