#!/usr/bin/env pwsh
<#
.SYNOPSIS
    CRITICAL ENFORCEMENT GUARD - Prevents commits without COMMIT_READY validation

.DESCRIPTION
    This script creates a "validation checkpoint" that blocks any commit attempts
    if COMMIT_READY.ps1 hasn't been successfully run within the last 45 minutes.

    EXTENDED TIME WINDOW (45 min):
    - Allows time for commit message editing and finalization
    - Accommodates complex multi-part commits
    - Prevents false "expired" errors during commit process
    - Terminal Visibility Policy (Jan 24, 2026): User can monitor all processes

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
$MaxAgeMinutes = 45  # Extended window to allow for commit message editing and finalization
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
    Write-Host "   Checkpoint created. Valid until: $(Get-Date -Date ((Get-Date).AddMinutes($MaxAgeMinutes)) -Format 'HH:mm:ss')" -ForegroundColor Green
}

function Test-CheckpointValidity {
    $age = Get-CheckpointAge

    if ($null -eq $age) {
        Write-Host "❌ COMMIT BLOCKED: No validation checkpoint found" -ForegroundColor Red
        Write-Host "   Run: .\COMMIT_READY.ps1 -Quick" -ForegroundColor Yellow
        Write-Host "   Then: .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1" -ForegroundColor Yellow
        return $false
    }

    if ($age -gt $MaxAgeMinutes) {
        Write-Host "❌ COMMIT BLOCKED: Validation checkpoint expired ($([math]::Round($age, 1)) min old)" -ForegroundColor Red
        Write-Host "   Run: .\COMMIT_READY.ps1 -Quick" -ForegroundColor Yellow
        Write-Host "   Then: .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1" -ForegroundColor Yellow
        return $false
    }

    Write-Host "✅ Validation checkpoint valid ($([math]::Round($age, 1)) min old)" -ForegroundColor Green
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
