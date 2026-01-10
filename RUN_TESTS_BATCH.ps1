#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run pytest tests in batches to avoid system freezes
.DESCRIPTION
    Splits test execution into smaller batches to reduce memory/CPU load
.PARAMETER BatchSize
    Number of test files per batch (default: 5)
.PARAMETER Verbose
    Show detailed output
.PARAMETER FastFail
    Stop on first failure
.EXAMPLE
    .\RUN_TESTS_BATCH.ps1 -BatchSize 10
    .\RUN_TESTS_BATCH.ps1 -Verbose
#>

param(
    [int]$BatchSize = 5,
    [switch]$Verbose,
    [switch]$FastFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Color functions
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }

function Restore-TestEnv {
    param($prevAllow, $prevRunner)

    if ($null -ne $prevAllow) {
        $env:SMS_ALLOW_DIRECT_PYTEST = $prevAllow
    } else {
        Remove-Item Env:SMS_ALLOW_DIRECT_PYTEST -ErrorAction SilentlyContinue
    }

    if ($null -ne $prevRunner) {
        $env:SMS_TEST_RUNNER = $prevRunner
    } else {
        Remove-Item Env:SMS_TEST_RUNNER -ErrorAction SilentlyContinue
    }
}

$previousAllow = $env:SMS_ALLOW_DIRECT_PYTEST
$previousRunner = $env:SMS_TEST_RUNNER

# Mark as compliant runner for conftest.py guard and policy enforcement
$env:SMS_ALLOW_DIRECT_PYTEST = "1"
$env:SMS_TEST_RUNNER = "batch"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Batch Test Runner (SMS v1.15.1)     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Verify we're in the right directory or find it
$projectRoot = $PSScriptRoot
if (-not (Test-Path "$projectRoot/backend/tests")) {
    # Maybe we're being called from a different directory, try to find it
    if (Test-Path "$projectRoot/../backend/tests") {
        $projectRoot = Split-Path -Parent $projectRoot
    } elseif (Test-Path "backend/tests") {
        $projectRoot = Get-Location
    } else {
        Write-Error "backend/tests directory not found!"
        Write-Host "Please run from project root directory or ensure backend folder exists." -ForegroundColor Red
        Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
        exit 1
    }
}

# Get all test files
Write-Info "Scanning for test files..."
$testFiles = Get-ChildItem -Path "$projectRoot/backend/tests" -Filter "test_*.py" -File |
    Where-Object { $_.Name -ne "test_main.py" } |  # Exclude if needed
    Sort-Object Name

$totalFiles = $testFiles.Count

Write-Success "Found $totalFiles test files"

if ($totalFiles -eq 0) {
    Write-Warning "No test files found!"
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    exit 0
}

# Split into batches
$batches = [System.Collections.ArrayList]::new()
for ($i = 0; $i -lt $totalFiles; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize - 1, $totalFiles - 1)
    $batch = $testFiles[$i..$end]
    [void]$batches.Add($batch)
}

$totalBatches = $batches.Count
Write-Info "Split into $totalBatches batches ($BatchSize files per batch)`n"

# Test execution summary
$results = @{
    TotalBatches = $totalBatches
    PassedBatches = 0
    FailedBatches = 0
    TotalTests = 0
    PassedTests = 0
    FailedTests = 0
    SkippedTests = 0
    Duration = 0
    FailedFiles = @()
}

$startTime = Get-Date

# Run each batch
$batchCount = 0
$passedCount = 0
$failedCount = 0

foreach ($batch in $batches) {
    $batchCount++

    Write-Host "`n┌─────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host "│ Batch $batchCount of $totalBatches (Files: $($batch.Count))" -ForegroundColor Yellow
    Write-Host "└─────────────────────────────────────────┘" -ForegroundColor Yellow

    # Show files in this batch
    foreach ($file in $batch) {
        Write-Host "  • $($file.Name)" -ForegroundColor Gray
    }

    # Build pytest command with full paths
    $testFiles = @()
    foreach ($file in $batch) {
        $testFiles += "$($file.FullName)"
    }

    Write-Info "Running tests..."
    $batchStart = Get-Date

    # Run pytest from the backend directory
    $backendDir = "$projectRoot/backend"
    Push-Location $backendDir -ErrorAction Stop | Out-Null

    try {
        if ($Verbose) {
            $output = python -m pytest $testFiles -v --tb=short 2>&1
        } else {
            $output = python -m pytest $testFiles -q --tb=line 2>&1
        }

        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    $batchDuration = (Get-Date) - $batchStart

    # Parse output
    $outputStr = $output -join "`n"

    # Extract test counts from pytest output
    $skipped = 0
    if ($outputStr -match "(\d+) passed") {
        $passed = [int]$matches[1]
        $passedCount += $passed
    }
    if ($outputStr -match "(\d+) failed") {
        $failed = [int]$matches[1]
        $failedCount += $failed
    }
    if ($outputStr -match "(\d+) skipped") {
        $skipped = [int]$matches[1]
    }

    # Display output
    Write-Host $outputStr

    # Batch result
    if ($exitCode -eq 0) {
        Write-Success "Batch $batchCount completed successfully in $([math]::Round($batchDuration.TotalSeconds, 1))s"
    } else {
        $failedFiles += $batch.Name
        Write-Error "Batch $batchCount failed in $([math]::Round($batchDuration.TotalSeconds, 1))s"

        if ($FastFail) {
            Write-Warning "FastFail enabled - stopping execution"
            break
        }
    }

    # Small delay between batches to let system breathe
    if ($batchCount -lt $totalBatches) {
        Write-Host "  Waiting 2 seconds before next batch..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}

$duration = ((Get-Date) - $startTime).TotalSeconds

# Final summary
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          TEST EXECUTION SUMMARY        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nBatches:" -ForegroundColor White
Write-Host "  Total:   $totalBatches" -ForegroundColor Gray
Write-Success "  Completed: $batchCount"

Write-Host "`nTests:" -ForegroundColor White
$totalTests = $passedCount + $failedCount
Write-Host "  Total:   $totalTests" -ForegroundColor Gray
if ($passedCount -gt 0) {
    Write-Success "  Passed:  $passedCount"
}
if ($failedCount -gt 0) {
    Write-Error "  Failed:  $failedCount"
}

Write-Host "`nDuration: $([math]::Round($duration, 1))s" -ForegroundColor Gray

Write-Host ""

# Exit code
if ($failedCount -eq 0) {
    Write-Success "All tests passed! 🎉"
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    exit 0
} else {
    Write-Error "Some tests failed"
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    exit 1
}
