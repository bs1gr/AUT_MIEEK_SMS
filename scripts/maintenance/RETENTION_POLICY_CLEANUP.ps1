#Requires -Version 7.0

<#!
.SYNOPSIS
    Maintenance-grade retention cleanup for state snapshots and backup metadata.

.DESCRIPTION
    Keeps the workspace lean by pruning only:
      1) artifacts/state snapshot files (STATE_*.md, COMMIT_READY_*.log)
    2) root-level commit_ready logs (commit_ready_*.log, COMMIT_READY_*.log)
    3) backup metadata files under backups/.metadata and backups/database/.metadata

    This script intentionally does NOT touch:
      - backup database files
      - source code
      - release artifacts
      - docs outside artifacts/state snapshots

.PARAMETER StateRetentionDays
    Remove snapshot files older than this many days.

.PARAMETER BackupMetadataRetentionDays
    Remove backup metadata files older than this many days.

.PARAMETER KeepRecentStateFiles
    Always keep at least this many newest snapshot files, regardless of age.

.PARAMETER KeepRecentMetadataFiles
    Always keep at least this many newest metadata files per metadata directory, regardless of age.

.PARAMETER RootCommitLogRetentionDays
    Remove root-level commit_ready log files older than this many days.

.PARAMETER KeepRecentRootCommitLogs
    Always keep at least this many newest root-level commit_ready logs, regardless of age.

.PARAMETER DryRun
    Show what would be deleted without deleting.

.EXAMPLE
    .\scripts\maintenance\RETENTION_POLICY_CLEANUP.ps1 -DryRun

.EXAMPLE
    .\scripts\maintenance\RETENTION_POLICY_CLEANUP.ps1 -StateRetentionDays 10 -BackupMetadataRetentionDays 14

.NOTES
    Version: 1.0.0
    Date: 2026-02-23
#>

[CmdletBinding()]
param(
    [ValidateRange(1, 365)]
    [int]$StateRetentionDays = 14,

    [ValidateRange(1, 365)]
    [int]$BackupMetadataRetentionDays = 30,

    [ValidateRange(0, 500)]
    [int]$KeepRecentStateFiles = 40,

    [ValidateRange(0, 500)]
    [int]$KeepRecentMetadataFiles = 50,

    [ValidateRange(1, 365)]
    [int]$RootCommitLogRetentionDays = 14,

    [ValidateRange(0, 500)]
    [int]$KeepRecentRootCommitLogs = 30,

    [ValidateRange(1, 500)]
    [int]$DryRunListLimit = 30,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$stateDir = Join-Path $rootDir "artifacts\state"
$rootLogCutoff = $null
$metadataDirs = @(
    (Join-Path $rootDir "backups\.metadata"),
    (Join-Path $rootDir "backups\database\.metadata")
)

function Write-Phase {
    param([string]$Text)
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "$('=' * 70)" -ForegroundColor Cyan
}

function Write-Info { param([string]$Text) Write-Host "ℹ️  $Text" -ForegroundColor Cyan }
function Write-Ok { param([string]$Text) Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "⚠️  $Text" -ForegroundColor Yellow }

function Format-Bytes {
    param([long]$Bytes)
    if ($Bytes -lt 1KB) { return "$Bytes B" }
    if ($Bytes -lt 1MB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    if ($Bytes -lt 1GB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    return "{0:N2} GB" -f ($Bytes / 1GB)
}

function Get-PrunableFiles {
    param(
        [Parameter()]
        [AllowEmptyCollection()]
        [System.IO.FileInfo[]]$Files,
        [Parameter(Mandatory)]
        [datetime]$Cutoff,
        [Parameter(Mandatory)]
        [int]$KeepRecent
    )

    if (-not $Files -or $Files.Count -eq 0) {
        return @()
    }

    $sorted = $Files | Sort-Object LastWriteTime -Descending
    $protected = if ($KeepRecent -gt 0) { $sorted | Select-Object -First $KeepRecent } else { @() }
    $protectedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($f in $protected) { [void]$protectedSet.Add($f.FullName) }

    return $sorted | Where-Object {
        $_.LastWriteTime -lt $Cutoff -and -not $protectedSet.Contains($_.FullName)
    }
}

function Remove-FilesSafe {
    param(
        [Parameter()]
        [AllowEmptyCollection()]
        [System.IO.FileInfo[]]$Files,
        [Parameter(Mandatory)]
        [string]$Category,
        [Parameter()]
        [int]$DryRunLimit = 30,
        [switch]$DryRun
    )

    $removedCount = 0
    $removedBytes = 0L

    if (-not $Files -or $Files.Count -eq 0) {
        return [PSCustomObject]@{
            Count = 0
            Bytes = 0L
        }
    }

    $displayCount = 0
    foreach ($file in $Files) {
        $size = $file.Length
        if ($DryRun) {
            if ($displayCount -lt $DryRunLimit) {
                Write-Host "  [DRY RUN] $Category -> $($file.FullName) ($(Format-Bytes $size))" -ForegroundColor DarkGray
                $displayCount++
            }
        }
        else {
            Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop
            Write-Host "  Removed $Category -> $($file.Name) ($(Format-Bytes $size))" -ForegroundColor Green
            $removedCount++
            $removedBytes += $size
        }
    }

    if ($DryRun -and $Files.Count -gt $DryRunLimit) {
        $hidden = $Files.Count - $DryRunLimit
        Write-Host "  [DRY RUN] ... and $hidden more $Category files" -ForegroundColor DarkGray
    }

    if ($DryRun) {
        $removedCount = $Files.Count
        $removedBytes = ($Files | Measure-Object Length -Sum).Sum
        if ($null -eq $removedBytes) { $removedBytes = 0 }
    }

    return [PSCustomObject]@{
        Count = $removedCount
        Bytes = [long]$removedBytes
    }
}

try {
    Write-Phase "Retention Policy Cleanup"

    if ($DryRun) {
        Write-Warn "DRY RUN mode - no files will be deleted"
    }

    $now = Get-Date
    $stateCutoff = $now.AddDays(-$StateRetentionDays)
    $metadataCutoff = $now.AddDays(-$BackupMetadataRetentionDays)
    $rootLogCutoff = $now.AddDays(-$RootCommitLogRetentionDays)

    Write-Info "State cutoff: $stateCutoff"
    Write-Info "Root commit log cutoff: $rootLogCutoff"
    Write-Info "Backup metadata cutoff: $metadataCutoff"

    $totalCount = 0
    $totalBytes = 0L

    # 1) artifacts/state snapshots
    Write-Phase "Step 1/2: State snapshots"
    if (Test-Path $stateDir) {
        $stateFiles = @(Get-ChildItem -Path $stateDir -File -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "STATE_*.md" -or $_.Name -like "COMMIT_READY_*.log" }
        )

        Write-Info "Found $($stateFiles.Count) snapshot files in artifacts/state"

        $statePrunable = Get-PrunableFiles -Files $stateFiles -Cutoff $stateCutoff -KeepRecent $KeepRecentStateFiles
        Write-Info "Snapshot files eligible for cleanup: $($statePrunable.Count)"

        $stateResult = Remove-FilesSafe -Files $statePrunable -Category "state-snapshot" -DryRunLimit $DryRunListLimit -DryRun:$DryRun
        $totalCount += $stateResult.Count
        $totalBytes += $stateResult.Bytes
    } else {
        Write-Info "State directory not found: $stateDir"
    }

    # 2) root-level commit logs
    Write-Phase "Step 2/3: Root commit logs"
    $rootCommitLogs = @(Get-ChildItem -Path $rootDir -File -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "commit_ready_*.log" -or $_.Name -like "COMMIT_READY_*.log" }
    )

    Write-Info "Found $($rootCommitLogs.Count) root commit logs"
    $rootLogsPrunable = Get-PrunableFiles -Files $rootCommitLogs -Cutoff $rootLogCutoff -KeepRecent $KeepRecentRootCommitLogs
    Write-Info "Root commit logs eligible for cleanup: $($rootLogsPrunable.Count)"
    $rootLogsResult = Remove-FilesSafe -Files $rootLogsPrunable -Category "root-commit-log" -DryRunLimit $DryRunListLimit -DryRun:$DryRun
    $totalCount += $rootLogsResult.Count
    $totalBytes += $rootLogsResult.Bytes

    # 3) backups metadata
    Write-Phase "Step 3/3: Backup metadata"
    foreach ($metaDir in $metadataDirs) {
        if (-not (Test-Path $metaDir)) {
            Write-Info "Metadata directory not found: $metaDir"
            continue
        }

        $metaFiles = @(Get-ChildItem -Path $metaDir -File -Force -ErrorAction SilentlyContinue)
        Write-Info "Found $($metaFiles.Count) metadata files in $metaDir"

        $metaPrunable = Get-PrunableFiles -Files $metaFiles -Cutoff $metadataCutoff -KeepRecent $KeepRecentMetadataFiles
        Write-Info "Metadata files eligible for cleanup in this dir: $($metaPrunable.Count)"

        $metaResult = Remove-FilesSafe -Files $metaPrunable -Category "backup-metadata" -DryRunLimit $DryRunListLimit -DryRun:$DryRun
        $totalCount += $metaResult.Count
        $totalBytes += $metaResult.Bytes
    }

    Write-Phase "Summary"
    if ($DryRun) {
        Write-Ok "Dry run complete. Files that would be removed: $totalCount"
        Write-Ok "Estimated reclaim: $(Format-Bytes $totalBytes)"
    } else {
        Write-Ok "Cleanup complete. Files removed: $totalCount"
        Write-Ok "Space reclaimed: $(Format-Bytes $totalBytes)"
    }

    Write-Info "Policy scope: snapshots + root commit logs + backup metadata only"
    exit 0
}
catch {
    Write-Host "❌ Retention cleanup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
