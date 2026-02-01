#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run pytest tests in batches to avoid system freezes with incremental failure tracking
.DESCRIPTION
    Splits test execution into smaller batches to reduce memory/CPU load.

    NEW FEATURES (Jan 31, 2026):
    - Incremental Testing: Failed test files are saved to .test-failures
    - Use -RetestFailed flag to re-run only previously failed tests
    - Eliminates need to re-run entire test suite after failures

.PARAMETER BatchSize
    Number of test files per batch (default: 5)
.PARAMETER Verbose
    Show detailed output
.PARAMETER FastFail
    Stop on first failure
.PARAMETER RetestFailed
    Only re-run test files that failed in previous run
    (Requires .test-failures file from previous run)
.PARAMETER FailureFile
    Path to file tracking failed tests (default: .test-failures)

.EXAMPLE
    .\RUN_TESTS_BATCH.ps1
    # Run all tests in batches

.EXAMPLE
    .\RUN_TESTS_BATCH.ps1 -BatchSize 10
    # Run with larger batch size

.EXAMPLE
    .\RUN_TESTS_BATCH.ps1 -Verbose
    # Run with detailed output

.EXAMPLE
    .\RUN_TESTS_BATCH.ps1 -RetestFailed
    # Re-run only previously failed tests (must run after a failure first)
#>

param(
    [int]$BatchSize = 3,
    [switch]$Verbose,
    [switch]$FastFail,
    [switch]$RetestFailed,
    [string]$FailureFile = ".test-failures",
    [string]$LogFile = "test-results/backend_batch_run_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Ensure test-results directory exists
$testResultsDir = "test-results"
if (-not (Test-Path $testResultsDir)) {
    New-Item -ItemType Directory -Path $testResultsDir -Force | Out-Null
}

# Create log file
$logPath = Join-Path (Get-Location) $LogFile
$logStream = $null
$logLocked = $false

# Function to write to both console and log file
function Write-Log {
    param($msg, [ConsoleColor]$Color = [Console]::ForegroundColor, [switch]$NoNewline)
    
    Write-Host $msg -ForegroundColor $Color -NoNewline:$NoNewline
    
    # Also write to log file (strip color codes)
    $plainMsg = $msg -replace '\e\[[0-9;]*m', ''
    
    try {
        Add-Content -Path $logPath -Value $plainMsg -NoNewline:$NoNewline -ErrorAction SilentlyContinue
    } catch {
        # Silently fail if we can't write to log
    }
}

# Color functions - now use Write-Log
function Write-Success { param($msg) Write-Log "✓ $msg" Green; Write-Log "`n" Green }
function Write-Info { param($msg) Write-Log "ℹ $msg" Cyan; Write-Log "`n" Cyan }
function Write-Warning { param($msg) Write-Log "⚠ $msg" Yellow; Write-Log "`n" Yellow }
function Write-ErrorMsg { param($msg) Write-Log "✗ $msg" Red; Write-Log "`n" Red }

# Legacy error function wrapper
function Write-Error { 
    param($msg) 
    Write-ErrorMsg $msg
}

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

Write-Log "`n╔════════════════════════════════════════╗`n" Cyan
Write-Log "║   Batch Test Runner (SMS v1.17.2)     ║`n" Cyan
Write-Log "╚════════════════════════════════════════╝`n`n" Cyan
Write-Log "📝 Logging to: $logPath`n`n" Cyan

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

# NEW: Check for failed tests if -RetestFailed flag provided (AFTER testFiles is discovered)
if ($RetestFailed -and (Test-Path $FailureFile)) {
    Write-Info "🔄 RETEST MODE: Running only previously failed tests"
    Write-Info "Reading failed tests from: $FailureFile"
    $failedTestFiles = Get-Content $FailureFile -ErrorAction SilentlyContinue | Where-Object { $_ -and -not $_.StartsWith("#") }
    if ($failedTestFiles) {
        Write-Info "Found $($failedTestFiles.Count) failed test file(s) to retest"
        # Filter testFiles to only include those that failed
        $testFiles = $testFiles | Where-Object { $_.Name -in $failedTestFiles }
        Write-Success "Filtered to $($testFiles.Count) test files for re-execution`n"
    }
}

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
$failedFiles = @()

foreach ($batch in $batches) {
    $batchCount++

    Write-Log "`n┌─────────────────────────────────────────┐`n" Yellow
    Write-Log "│ Batch $batchCount of $totalBatches (Files: $($batch.Count))`n" Yellow
    Write-Log "└─────────────────────────────────────────┘`n" Yellow

    # Show files in this batch
    foreach ($file in $batch) {
        Write-Log "  • $($file.Name)`n" Gray
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
        # Set PYTHONPATH to project root to ensure local backend package is used
        $env:PYTHONPATH = $projectRoot

        if ($Verbose) {
            $output = python -m pytest $testFiles -v --tb=short 2>&1
        } else {
            $output = python -m pytest $testFiles -q --tb=line 2>&1
        }

        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
        # Clean up PYTHONPATH
        Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
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

    # Display output (both console and log)
    Write-Log $outputStr White
    Write-Host $outputStr

    # Batch result
    if ($exitCode -eq 0) {
        Write-Success "Batch $batchCount completed successfully in $([math]::Round($batchDuration.TotalSeconds, 1))s"
    } else {
        $failedFiles += $batch.Name
        Write-ErrorMsg "Batch $batchCount failed in $([math]::Round($batchDuration.TotalSeconds, 1))s"

        if ($FastFail) {
            Write-Warning "FastFail enabled - stopping execution"
            break
        }
    }

    # Small delay between batches to let system breathe
    if ($batchCount -lt $totalBatches) {
        Write-Log "  Waiting 2 seconds before next batch...`n" DarkGray
    }
}

$duration = ((Get-Date) - $startTime).TotalSeconds

# Final summary
Write-Log "`n╔════════════════════════════════════════╗`n" Cyan
Write-Log "║          TEST EXECUTION SUMMARY        ║`n" Cyan
Write-Log "╚════════════════════════════════════════╝`n`n" Cyan

Write-Log "Batches:`n" White
Write-Log "  Total:   $totalBatches`n" Gray
Write-Success "  Completed: $batchCount"

Write-Log "Tests:`n" White
$totalTests = $passedCount + $failedCount
Write-Log "  Total:   $totalTests`n" Gray
if ($passedCount -gt 0) {
    Write-Success "  Passed:  $passedCount"
}
if ($failedCount -gt 0) {
    Write-ErrorMsg "  Failed:  $failedCount"
}
if ($failedFiles.Count -gt 0) {
    Write-ErrorMsg "  Failed Batches: $($failedFiles.Count)"
}

Write-Log "Duration: $([math]::Round($duration, 1))s`n`n" Gray
Write-Log "📝 Full log saved to: $logPath`n" Cyan

# Exit code
if ($failedCount -eq 0 -and $failedFiles.Count -eq 0) {
    Write-Success "All tests passed! 🎉"
    Write-Log "✓ All tests passed! 🎉`n" Green
    # Clear failure file since all tests passed
    if (Test-Path $FailureFile) {
        Remove-Item $FailureFile -Force
    }
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    Write-Log "`n✓ Test log completed: $logPath`n" Green
    exit 0
} else {
    Write-ErrorMsg "Some tests failed"
    Write-Log "✗ Some tests failed`n" Red

    # NEW: Save failed test files for future --retest-failed runs
    if ($failedFiles.Count -gt 0) {
        Write-Info "`n💾 Saving failed test files for re-testing..."
        Write-Info "   To retest only failed files, run:"
        Write-Host "   .\RUN_TESTS_BATCH.ps1 -RetestFailed" -ForegroundColor Yellow

        # Save failed files with comment header
        $failureContent = @(
            "# Failed test files (generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
            "# To retest only these files, run: .\RUN_TESTS_BATCH.ps1 -RetestFailed"
            "# To clear this file, run: Remove-Item $FailureFile"
            ""
        ) + $failedFiles

        Set-Content -Path $FailureFile -Value $failureContent -Force
        Write-Success "Failed files saved to: $FailureFile ($($failedFiles.Count) files)"
    }

    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    Write-Log "`n✗ Test log completed: $logPath`n" Red
    exit 1
}
