<#
.SYNOPSIS
    Comprehensive pre-commit workflow orchestrator.

.DESCRIPTION
    Runs the existing automation stack end-to-end without duplicating logic:
    1) Optional cleanup using scripts/CLEANUP_PRE_RELEASE.ps1
    2) Full COMMIT_READY.ps1 validation (mode configurable)
    3) Optional smoke/health probe via scripts/SMOKE_TEST.ps1
    4) Git status + diffstat snapshot
    5) Generates/updates COMMIT_MESSAGE.txt with a ready-to-use summary

.PARAMETER Mode
    quick | standard | full (default: full)

.PARAMETER SkipCleanup
    Skip the pre-release cleanup step (COMMIT_READY still runs its own cleanup unless told otherwise).

.PARAMETER CleanupDryRun
    Run cleanup in dry-run mode (no deletions).

.PARAMETER IncludeBackups
    Allow cleanup to include backup folders (off by default for safety).

.PARAMETER SkipSmoke
    Skip the standalone smoke test probe (COMMIT_READY full mode already performs health checks).

.PARAMETER SkipGitReview
    Skip git status/diff collection and commit template generation.

.PARAMETER SkipVersionSync
    Do not propagate VERSION to other files (otherwise passed to COMMIT_READY).

.PARAMETER SkipDocsSync
    Skip docs/script version banner syncing (otherwise passed to COMMIT_READY).

.PARAMETER GenerateCommit
    Force COMMIT_READY to emit a commit message even if checks fail.

.PARAMETER AutoFix
    Forward AutoFix to COMMIT_READY (requires DEV_EASE=true for local runs).

.PARAMETER NonInteractive
    Non-interactive execution (auto-accept prompts in COMMIT_READY paths that respect it).

.EXAMPLE
    # Full workflow with cleanup and smoke tests
    pwsh ./scripts/PRECOMMIT_WORKFLOW.ps1

.EXAMPLE
    # Quick mode without cleanup or smoke
    pwsh ./scripts/PRECOMMIT_WORKFLOW.ps1 -Mode quick -SkipCleanup -SkipSmoke

#>

[CmdletBinding()]
param(
    [ValidateSet('quick','standard','full')]
    [string]$Mode = 'full',
    [switch]$SkipCleanup,
    [switch]$CleanupDryRun,
    [switch]$IncludeBackups,
    [switch]$SkipSmoke,
    [switch]$SkipGitReview,
    [switch]$SkipVersionSync,
    [switch]$SkipDocsSync,
    [switch]$GenerateCommit,
    [switch]$AutoFix,
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir

$commitReady     = Join-Path $repoRoot "COMMIT_READY.ps1"
$cleanupScript   = Join-Path $scriptDir "CLEANUP_PRE_RELEASE.ps1"
$smokeScript     = Join-Path $scriptDir "SMOKE_TEST.ps1"
$dockerScript    = Join-Path $repoRoot "DOCKER.ps1"
$commitMessage   = Join-Path $repoRoot "COMMIT_MESSAGE.txt"

$startTime = Get-Date

$results = [ordered]@{
    Cleanup    = $null
    Precommit  = $null
    Smoke      = $null
    GitStatus  = @()
    DiffStat   = @()
    Duration   = $null
}

function Invoke-SubCommand {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Path,
        [string[]]$Arguments = @()
    )

    if (-not (Test-Path $Path)) {
        Write-Warning "$Name not found at $Path. Skipping."
        return $null
    }

    Write-Host "\n▶️  $Name" -ForegroundColor Cyan
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments
    return $LASTEXITCODE
}

function Format-Status {
    param([object]$Code)
    if ($null -eq $Code) { return 'SKIPPED' }
    if ($Code -is [array]) { $Code = $Code[-1] }

    $intCode = $null
    if ([int]::TryParse([string]$Code, [ref]$intCode)) {
        switch ($intCode) {
            0 { return 'OK' }
            default { return "FAIL ($intCode)" }
        }
    }
    return "FAIL ($Code)"
}

function Test-HealthEndpoint {
    param(
        [Parameter(Mandatory)][string]$Url,
        [int]$TimeoutSec = 5
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $resp.StatusCode -eq 200
    }
    catch { return $false }
}

# 1) Cleanup (optional)
if (-not $SkipCleanup) {
    $cleanupArgs = @()
    if ($CleanupDryRun) { $cleanupArgs += '-DryRun' }
    if ($IncludeBackups) { $cleanupArgs += '-IncludeBackups' }
    $results.Cleanup = Invoke-SubCommand -Name 'Cleanup (CLEANUP_PRE_RELEASE)' -Path $cleanupScript -Arguments $cleanupArgs
}

# 2) COMMIT_READY full workflow
$commitArgs = @('-Mode', $Mode)
if (-not $SkipVersionSync) { $commitArgs += '-SyncVersion' }
if (-not $SkipDocsSync)    { $commitArgs += '-UpdateDocs' }
if ($GenerateCommit)       { $commitArgs += '-GenerateCommit' }
if ($AutoFix)              { $commitArgs += '-AutoFix' }
if ($NonInteractive)       { $commitArgs += '-NonInteractive' }

$results.Precommit = Invoke-SubCommand -Name 'Pre-commit (COMMIT_READY)' -Path $commitReady -Arguments $commitArgs

# 3) Smoke test probe (optional, quick)
if (-not $SkipSmoke) {
    $stopDockerAfter = $false
    $healthy = $false
    $healthTargets = @(
        'http://localhost:8080/health',
        'http://localhost:8000/health'
    )

    foreach ($target in $healthTargets) {
        if (Test-HealthEndpoint -Url $target -TimeoutSec 4) { $healthy = $true; break }
    }

    if (-not $healthy -and (Test-Path $dockerScript)) {
        Write-Host "No running instance detected; starting Docker for smoke probe..." -ForegroundColor Yellow
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $dockerScript -Start | Write-Host
        $stopDockerAfter = $true

        $maxAttempts = 12
        for ($i = 1; $i -le $maxAttempts; $i++) {
            if (Test-HealthEndpoint -Url 'http://localhost:8080/health' -TimeoutSec 5) { $healthy = $true; break }
            Start-Sleep -Seconds 3
        }
    }

    $results.Smoke = Invoke-SubCommand -Name 'Smoke Test' -Path $smokeScript -Arguments @('-TimeoutSec','10')

    if ($stopDockerAfter -and (Test-Path $dockerScript)) {
        Write-Host "Stopping Docker instance started for smoke probe..." -ForegroundColor Yellow
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $dockerScript -Stop | Write-Host
    }
}

# 4) Git snapshot (optional)
if (-not $SkipGitReview) {
    try {
        $status = git status --short 2>$null
        if ($status) { $results.GitStatus = $status } else { $results.GitStatus = @('Clean working tree') }
    }
    catch { $results.GitStatus = @('git status unavailable') }

    try {
        $diffStat = git diff --stat 2>$null
        if ($diffStat) { $results.DiffStat = $diffStat }
    }
    catch { $results.DiffStat = @('git diff --stat unavailable') }
}

$results.Duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)

# 5) Commit message template
if (-not $SkipGitReview) {
    $cleanupStatus = Format-Status $results.Cleanup
    $preStatus     = Format-Status $results.Precommit
    $smokeStatus   = Format-Status $results.Smoke

    $msg = @"
chore: automated pre-commit workflow

Mode: $Mode
Started: $startTime
Duration: $($results.Duration)s

Results
=======
- Cleanup:     $cleanupStatus
- COMMIT_READY: $preStatus
- Smoke test:  $smokeStatus

Git Status
==========
$([string]::Join("`n", $results.GitStatus))

Diff Stat
=========
$([string]::Join("`n", $results.DiffStat))

Next Steps
==========
1) Review changes: git status
2) Stage: git add .
3) Commit: git commit -m "chore: automated pre-commit workflow"
4) Push:   git push

(Template auto-generated by scripts/PRECOMMIT_WORKFLOW.ps1)
"@

    Set-Content -Path $commitMessage -Value $msg -Encoding UTF8
    Write-Host "\n📝 Commit template updated at $commitMessage" -ForegroundColor Green
}

# Exit code aggregation (non-zero if any executed step failed)
$failed = @()

$failureCheck = @(
    @{ Name = 'cleanup';  Code = $results.Cleanup }
    @{ Name = 'precommit'; Code = $results.Precommit }
    @{ Name = 'smoke';    Code = $results.Smoke }
)

foreach ($entry in $failureCheck) {
    $codeToCheck = $entry.Code
    if ($codeToCheck -is [array]) { $codeToCheck = $codeToCheck[-1] }
    if ($null -eq $codeToCheck) { continue }

    $intCode = $null
    if ([int]::TryParse([string]$codeToCheck, [ref]$intCode)) {
        if ($intCode -ne 0) { $failed += $entry.Name }
    } else {
        $failed += $entry.Name
    }
}

if ($failed.Count -gt 0) {
    Write-Host "\n❌ Workflow completed with failures: $([string]::Join(', ', $failed))" -ForegroundColor Red
    exit 1
}

Write-Host "\n✅ Workflow completed successfully in $($results.Duration)s" -ForegroundColor Green
exit 0
