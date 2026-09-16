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

    A batch that exits non-zero having printed nothing did not run tests - the process
    died - and is retried once. Reported test failures always print output and are never
    retried.

.PARAMETER BatchSize
    Number of test files per batch (default: 5)
.PARAMETER Verbose
    Show detailed output
.PARAMETER FastFail
    Stop on first failure
.PARAMETER RetestFailed
    Only re-run test files that failed in previous run
    (Requires .test-failures file from previous run)
.PARAMETER ShowOutput
    Print per-batch pytest output to console (default logs only to file)
.PARAMETER InterBatchDelaySeconds
    Seconds to wait between batches (default: 2)
.PARAMETER FailureFile
    Path to file tracking failed tests (default: .test-failures)
.PARAMETER LogFile
    Path of the run log. A relative path resolves against src/backend/ no matter where
    the script is invoked from, so logs always land in src/backend/test-results/.
    The finished log is also copied to src/backend/test-results/backend_batch_full.txt,
    the fixed "latest run" path the project's docs tell you to read.

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

.EXAMPLE
    .\RUN_TESTS_BATCH.ps1 -ShowOutput -InterBatchDelaySeconds 5
    # Print batch output and pause longer between batches
#>

param(
    [int]$BatchSize = 3,
    [switch]$Verbose,
    [switch]$FastFail,
    [switch]$RetestFailed,
    [switch]$ShowOutput,
    [string]$FailureFile = ".test-failures",
    [string]$LogFile = "test-results/backend_batch_run_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt",
    [int]$InterBatchDelaySeconds = 2
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Script lives at infra/scripts/testing/ — project root is three levels up
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

# Resolve the log path against src/backend, NOT the caller's working directory.
# COMMIT_READY runs this from src/backend while a developer runs it from the repo root,
# so run logs used to scatter across two separate test-results directories — which is why
# no document could truthfully point at a fixed log path.
$logPath = if ([System.IO.Path]::IsPathRooted($LogFile)) {
    [System.IO.Path]::GetFullPath($LogFile)
} else {
    [System.IO.Path]::GetFullPath((Join-Path (Join-Path $projectRoot "src/backend") $LogFile))
}
$logDir = Split-Path -Parent $logPath
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Function to write to both console and log file
function Write-Log {
    param($msg, [ConsoleColor]$Color = [Console]::ForegroundColor, [switch]$NoNewline, [switch]$LogOnly)

    if (-not $LogOnly) {
        Write-Host $msg -ForegroundColor $Color -NoNewline:$NoNewline
    }

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

# Copy the finished log to a fixed filename. CLAUDE.md's "Verification" rule,
# .claude/agents/test-runner.md and .github/copilot-instructions.md all tell the reader to
# check results by reading src/backend/test-results/backend_batch_full.txt — a file nothing
# ever wrote, so that mandated check failed with a path error on every run, and the piped
# Select-String printed nothing, which reads like "no failures found".
function Save-LatestLogCopy {
    $stablePath = Join-Path (Split-Path -Parent $logPath) "backend_batch_full.txt"
    try {
        Copy-Item -Path $logPath -Destination $stablePath -Force
    } catch {
        Write-Host "Could not update $stablePath : $_" -ForegroundColor DarkYellow
    }
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
if (-not $ShowOutput) {
    Write-Info "Batch output is log-only to reduce terminal load. Use -ShowOutput to print batch output."
}

# $projectRoot is resolved from $PSScriptRoot at the top of the script
$backendTestsDir = "$projectRoot/src/backend/tests"
if (-not (Test-Path $backendTestsDir)) {
    Write-Error "backend/tests directory not found!"
    Write-Host "Please run from project root directory or ensure backend folder exists." -ForegroundColor Red
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    exit 1
}

$failureFilePath = if ([System.IO.Path]::IsPathRooted($FailureFile)) {
    [System.IO.Path]::GetFullPath($FailureFile)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $projectRoot $FailureFile))
}

$legacyFailureFilePath = $null
if (-not [System.IO.Path]::IsPathRooted($FailureFile)) {
    $cwdFailureFilePath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $FailureFile))
    if (-not [string]::Equals($cwdFailureFilePath, $failureFilePath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $legacyFailureFilePath = $cwdFailureFilePath
    }
}

# Get all test files
Write-Info "Scanning for test files..."
$testFiles = @(Get-ChildItem -Path $backendTestsDir -Filter "test_*.py" -File |
    Where-Object { $_.Name -ne "test_main.py" } |  # Exclude if needed
    Sort-Object Name)

# NEW: Check for failed tests if -RetestFailed flag provided (AFTER testFiles is discovered)
if ($RetestFailed -and -not (Test-Path $failureFilePath) -and $legacyFailureFilePath -and (Test-Path $legacyFailureFilePath)) {
    Write-Warning "Using legacy failure file path from current directory: $legacyFailureFilePath"
    $failureFilePath = $legacyFailureFilePath
}

if ($RetestFailed -and (Test-Path $failureFilePath)) {
    Write-Info "🔄 RETEST MODE: Running only previously failed tests"
    Write-Info "Reading failed tests from: $failureFilePath"
    $failedTestFiles = @(Get-Content $failureFilePath -ErrorAction SilentlyContinue | Where-Object { $_ -and -not $_.StartsWith("#") })
    if ($failedTestFiles) {
        Write-Info "Found $($failedTestFiles.Count) failed test file(s) to retest"
        # Filter testFiles to only include those that failed
        $testFiles = @($testFiles | Where-Object { $_.Name -in $failedTestFiles })
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

$startTime = Get-Date

# Run each batch
$batchCount = 0
$passedBatchCount = 0
$failedBatchCount = 0
$passedCount = 0
$failedCount = 0
$skippedCount = 0
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
    $backendDir = "$projectRoot/src/backend"

    # A batch that exits non-zero without printing anything never ran its tests - the
    # process died. That happened once during a commit gate (2026-09-16) and was not
    # reproducible, so it is retried once: a real test failure always prints something and
    # is never retried, and a genuine crash fails twice and still fails the run.
    $attempt = 0
    $retryAttempted = $false
    while ($true) {
        $attempt++
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

        $outputStr = $output -join "`n"
        $abortedSilently = ($exitCode -ne 0) -and [string]::IsNullOrWhiteSpace($outputStr)
        if (-not ($abortedSilently -and $attempt -eq 1)) { break }

        $retryAttempted = $true
        Write-Warning "Batch $batchCount aborted with no output (exit code $exitCode) - retrying once"
    }

    $batchDuration = (Get-Date) - $batchStart

    # Count test results from pytest dot-notation progress lines.
    # The final "N passed in Xs" summary line is NOT emitted to captured stdout on Windows
    # when pytest is not attached to a TTY, so we count result markers directly:
    #   . = pass   F = fail   s = skip   x = xfail   E = error
    $passed = 0
    $skipped = 0
    $failedDots = 0
    foreach ($line in ($output | Where-Object { $_ -is [string] })) {
        # Progress lines contain only dots/markers, spaces, brackets, digits, %
        if ($line -match '^[.FsxEw \[\]\d%]+$') {
            $passed += ([regex]::Matches($line, '\.')).Count
            # E is a collection/fixture error: the test never ran, which is a failure,
            # not a neutral outcome. Counting only F used to report such a batch as
            # "0 failed" while its exit code said otherwise.
            $failedDots += ([regex]::Matches($line, '[FE]')).Count
            $skipped += ([regex]::Matches($line, 's')).Count
        }
    }
    $passedCount += $passed
    $failedCount += $failedDots
    $skippedCount += $skipped

    # Display output (Write-Log handles both console and file)
    $logOnlyOutput = -not $ShowOutput
    $noOutput = [string]::IsNullOrWhiteSpace($outputStr)
    if ($noOutput) {
        Write-Log "(pytest wrote nothing to stdout or stderr for this batch)`n" White -LogOnly:$logOnlyOutput
    } else {
        Write-Log $outputStr White -LogOnly:$logOnlyOutput
    }

    # Batch result
    if ($exitCode -eq 0) {
        $passedBatchCount++
        Write-Success "Batch $batchCount completed successfully in $([math]::Round($batchDuration.TotalSeconds, 1))s"
    } else {
        $failedFiles += $batch.Name
        $failedBatchCount++

        # Always record the exit code: it is the only thing that survives when pytest
        # dies before printing, and its value says which kind of failure this was.
        $exitMeaning = switch ($exitCode) {
            1 { "tests failed" }
            2 { "run interrupted" }
            3 { "internal pytest error" }
            4 { "pytest usage error" }
            5 { "no tests collected" }
            default { "not a pytest exit code - the interpreter itself aborted" }
        }
        $exitHex = '0x{0:X8}' -f $exitCode
        $retryNote = if ($retryAttempted) { ", failed twice" } else { "" }
        Write-ErrorMsg "Batch $batchCount failed in $([math]::Round($batchDuration.TotalSeconds, 1))s (exit code $exitCode / $exitHex - $exitMeaning$retryNote)"

        # A batch that exits non-zero having printed nothing did not run any tests:
        # pytest was killed or the interpreter aborted before flushing its buffers.
        # Without this note the log holds only "failed in 0.7s" and there is nothing
        # left to diagnose after the fact.
        if ($noOutput) {
            Write-ErrorMsg "  No output was captured, so this is an abort (crash/kill), not reported test failures."
            Write-ErrorMsg "  Files in this batch: $($batch.Name -join ', ')"
            Write-ErrorMsg "  Reproduce with: .\infra\scripts\testing\RUN_TESTS_BATCH.ps1 -RetestFailed -ShowOutput"
        }

        if ($FastFail) {
            Write-Warning "FastFail enabled - stopping execution"
            break
        }
    }

    # Small delay between batches to let system breathe
    if ($batchCount -lt $totalBatches) {
        Write-Log "  Waiting $InterBatchDelaySeconds seconds before next batch...`n" DarkGray
        if ($InterBatchDelaySeconds -gt 0) {
            Start-Sleep -Seconds $InterBatchDelaySeconds
        }
    }
}

$duration = ((Get-Date) - $startTime).TotalSeconds

# Final summary
Write-Log "`n╔════════════════════════════════════════╗`n" Cyan
Write-Log "║          TEST EXECUTION SUMMARY        ║`n" Cyan
Write-Log "╚════════════════════════════════════════╝`n`n" Cyan

Write-Log "Batches:`n" White
Write-Log "  Total:   $totalBatches`n" Gray
Write-Log "  Ran:     $batchCount`n" Gray
Write-Success "  Passed:  $passedBatchCount"
if ($failedBatchCount -gt 0) {
    # This used to print $failedFiles.Count and call it "Failed Batches" - every file
    # of a failing batch is recorded, so one bad batch of 5 reported as 5 failed batches.
    $fileWord = if ($failedFiles.Count -eq 1) { "test file" } else { "test files" }
    Write-ErrorMsg "  Failed:  $failedBatchCount ($($failedFiles.Count) $fileWord recorded for retest)"
}

Write-Log "Tests:`n" White
$totalTests = $passedCount + $failedCount + $skippedCount
Write-Log "  Total:   $totalTests`n" Gray
if ($passedCount -gt 0) {
    Write-Success "  Passed:  $passedCount"
}
if ($failedCount -gt 0) {
    Write-ErrorMsg "  Failed:  $failedCount"
}
if ($skippedCount -gt 0) {
    Write-Log "  Skipped: $skippedCount`n" Gray
}

Write-Log "Duration: $([math]::Round($duration, 1))s`n`n" Gray
Write-Log "📝 Full log saved to: $logPath`n" Cyan

# Exit code
if ($failedCount -eq 0 -and $failedBatchCount -eq 0) {
    Write-Success "All tests passed! 🎉"
    Write-Log "✓ All tests passed! 🎉`n" Green
    # Clear failure file since all tests passed
    if (Test-Path $failureFilePath) {
        Remove-Item $failureFilePath -Force
    }
    if ($legacyFailureFilePath -and (Test-Path $legacyFailureFilePath)) {
        Remove-Item $legacyFailureFilePath -Force
    }
    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    Write-Log "`n✓ Test log completed: $logPath`n" Green
    Save-LatestLogCopy
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
            "# To clear this file, run: Remove-Item '$failureFilePath'"
            ""
        ) + $failedFiles

        Set-Content -Path $failureFilePath -Value $failureContent -Force
        if ($legacyFailureFilePath -and (Test-Path $legacyFailureFilePath)) {
            Remove-Item $legacyFailureFilePath -Force
        }
        Write-Success "Failed files saved to: $failureFilePath ($($failedFiles.Count) files)"
    }

    Restore-TestEnv -prevAllow $previousAllow -prevRunner $previousRunner
    Write-Log "`n✗ Test log completed: $logPath`n" Red
    Save-LatestLogCopy
    exit 1
}
