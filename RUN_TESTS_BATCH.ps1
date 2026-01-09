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

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Batch Test Runner (SMS v1.15.1)     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Verify we're in the right directory
if (-not (Test-Path "backend/tests")) {
    Write-Error "backend/tests directory not found!"
    Write-Host "Please run from project root directory." -ForegroundColor Red
    exit 1
}

# Get all test files
Write-Info "Scanning for test files..."
$testFiles = Get-ChildItem -Path "backend/tests" -Filter "test_*.py" -File |
    Where-Object { $_.Name -ne "test_main.py" } |  # Exclude if needed
    Sort-Object Name

$totalFiles = $testFiles.Count
Write-Success "Found $totalFiles test files"

if ($totalFiles -eq 0) {
    Write-Warning "No test files found!"
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
Push-Location "backend"
try {
    for ($batchNum = 0; $batchNum -lt $totalBatches; $batchNum++) {
        $batch = $batches[$batchNum]
        $batchIndex = $batchNum + 1

        Write-Host "`n┌─────────────────────────────────────────┐" -ForegroundColor Yellow
        Write-Host "│ Batch $batchIndex of $totalBatches (Files: $($batch.Count))" -ForegroundColor Yellow
        Write-Host "└─────────────────────────────────────────┘" -ForegroundColor Yellow

        # Show files in this batch
        foreach ($file in $batch) {
            Write-Host "  • $($file.Name)" -ForegroundColor Gray
        }

        # Build pytest command with absolute paths
        $testPaths = $batch | ForEach-Object { $_.FullName }
        $testPathsStr = ($testPaths | ForEach-Object { "`"$_`"" }) -join " "

        Write-Info "Running tests..."

        # Run pytest with progress
        $batchStart = Get-Date

        if ($Verbose) {
            $output = python -m pytest $testPathsStr -v --tb=short 2>&1
        } else {
            $output = python -m pytest $testPathsStr -q --tb=line 2>&1
        }

        $batchDuration = (Get-Date) - $batchStart
        $exitCode = $LASTEXITCODE

        # Parse output
        $outputStr = $output -join "`n"

        # Extract test counts from pytest output
        if ($outputStr -match "(\d+) passed") {
            $passed = [int]$matches[1]
            $results.PassedTests += $passed
        }
        if ($outputStr -match "(\d+) failed") {
            $failed = [int]$matches[1]
            $results.FailedTests += $failed
        }
        if ($outputStr -match "(\d+) skipped") {
            $skipped = [int]$matches[1]
            $results.SkippedTests += $skipped
        }

        # Display output
        Write-Host $outputStr

        # Batch result
        if ($exitCode -eq 0) {
            $results.PassedBatches++
            Write-Success "Batch $batchIndex completed successfully in $([math]::Round($batchDuration.TotalSeconds, 1))s"
        } else {
            $results.FailedBatches++
            $results.FailedFiles += $batch.Name
            Write-Error "Batch $batchIndex failed in $([math]::Round($batchDuration.TotalSeconds, 1))s"

            if ($FastFail) {
                Write-Warning "FastFail enabled - stopping execution"
                break
            }
        }

        # Small delay between batches to let system breathe
        if ($batchIndex -lt $totalBatches) {
            Write-Host "  Waiting 2 seconds before next batch..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 2
        }
    }
} finally {
    Pop-Location
}

$results.Duration = ((Get-Date) - $startTime).TotalSeconds

# Final summary
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          TEST EXECUTION SUMMARY        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nBatches:" -ForegroundColor White
Write-Host "  Total:   $($results.TotalBatches)" -ForegroundColor Gray
Write-Success "  Passed:  $($results.PassedBatches)"
if ($results.FailedBatches -gt 0) {
    Write-Error "  Failed:  $($results.FailedBatches)"
}

Write-Host "`nTests:" -ForegroundColor White
$totalTests = $results.PassedTests + $results.FailedTests + $results.SkippedTests
Write-Host "  Total:   $totalTests" -ForegroundColor Gray
if ($results.PassedTests -gt 0) {
    Write-Success "  Passed:  $($results.PassedTests)"
}
if ($results.FailedTests -gt 0) {
    Write-Error "  Failed:  $($results.FailedTests)"
}
if ($results.SkippedTests -gt 0) {
    Write-Warning "  Skipped: $($results.SkippedTests)"
}

Write-Host "`nDuration: $([math]::Round($results.Duration, 1))s" -ForegroundColor Gray

if ($results.FailedFiles.Count -gt 0) {
    Write-Host "`nFailed Files:" -ForegroundColor Red
    foreach ($file in $results.FailedFiles) {
        Write-Host "  • $file" -ForegroundColor Red
    }
}

Write-Host ""

# Exit code
if ($results.FailedBatches -eq 0 -and $results.FailedTests -eq 0) {
    Write-Success "All tests passed! 🎉"
    exit 0
} else {
    Write-Error "Some tests failed"
    exit 1
}
