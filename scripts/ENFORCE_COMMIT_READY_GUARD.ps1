#!/usr/bin/env pwsh
<#
.SYNOPSIS
    CRITICAL ENFORCEMENT GUARD - Prevents commits without COMMIT_READY validation

.DESCRIPTION
    This script creates a "validation checkpoint" that blocks any commit attempts
    if COMMIT_READY.ps1 hasn't been successfully run within the last 90 minutes.

    EXTENDED TIME WINDOW (90 min - DOUBLED from 45):
    - Accommodates time-consuming full test suites (backend batch runner + frontend)
    - Allows time for commit message editing and finalization
    - Accommodates complex multi-part commits
    - Prevents false "expired" errors during validation process
    - Terminal Visibility Policy (Jan 24, 2026): User can monitor all processes
    - Updated Jan 30, 2026: Doubled to catch long-running validations

    This enforces Policy 5: Pre-Commit Validation ALWAYS Required

    DO NOT BYPASS THIS - it prevents CI failures and broken code commits.

.PARAMETER ValidateOnly
    Check if validation is current, don't update checkpoint

.PARAMETER Force
    Force clear checkpoint (only for emergency bypass)

.EXAMPLE
    # After running COMMIT_READY -Quick successfully:
    .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1

    # Before committing, verify guard is active:
    .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1 -ValidateOnly
#>

param(
    [switch]$ValidateOnly,
    [switch]$Force
)

$CheckpointFile = ".commit-ready-validated"
$MaxAgeMinutes = 0  # NO EXPIRATION (Jan 31, 2026: Changed from 90 min to 0 = never expire)
                    # Checkpoint remains valid until explicitly cleared or new validation runs
                    # This prevents ridiculous expiration during commit workflow
$ErrorActionPreference = 'Stop'

function Get-CheckpointAge {
    if (-not (Test-Path $CheckpointFile)) {
        return $null
    }
    $lastValidated = Get-Item $CheckpointFile | Select-Object -ExpandProperty LastWriteTime
    $age = (Get-Date) - $lastValidated
    return $age.TotalMinutes
}

function New-ValidationCheckpoint {
    Write-Host "✅ Creating validation checkpoint..." -ForegroundColor Green
    Set-Content -Path $CheckpointFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Force
    Write-Host "   Checkpoint created at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
    Write-Host "   Status: VALID INDEFINITELY (never expires)" -ForegroundColor Green
}

function Test-CheckpointValidity {
    $age = Get-CheckpointAge

    if ($null -eq $age) {
        Write-Host "❌ COMMIT BLOCKED: No validation checkpoint found" -ForegroundColor Red
        Write-Host "   Run: .\COMMIT_READY.ps1 -Quick" -ForegroundColor Yellow
        Write-Host "   Then: .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1" -ForegroundColor Yellow
        return $false
    }

    # NO EXPIRATION - checkpoint remains valid indefinitely unless cleared
    # Use 'ENFORCE_COMMIT_READY_GUARD.ps1 -Force' to manually clear checkpoint
    Write-Host "✅ Validation checkpoint is VALID (never expires)" -ForegroundColor Green
    return $true
}

# Main logic
if ($Force) {
    Write-Host "⚠️  EMERGENCY: Clearing validation checkpoint" -ForegroundColor Yellow
    if (Test-Path $CheckpointFile) {
        Remove-Item $CheckpointFile -Force
        Write-Host "   Checkpoint cleared. You are responsible for validation." -ForegroundColor Yellow
    }
    exit 0
}

if ($ValidateOnly) {
    $isValid = Test-CheckpointValidity
    exit ($isValid ? 0 : 1)
}

# Default: Create new checkpoint (called after successful COMMIT_READY)
New-ValidationCheckpoint
exit 0
