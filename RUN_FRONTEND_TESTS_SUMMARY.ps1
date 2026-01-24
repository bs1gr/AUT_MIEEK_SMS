#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
  Frontend test runner that captures output and writes a summary file.
.DESCRIPTION
  Runs Vitest in the frontend directory (or optionally skips run) and
  captures console output to test-results/frontend/vitest_output.txt.
  Writes a summary to test-results/frontend/summary.txt with timestamp,
  exit code, optional filter pattern, and a detected summary line if present.
.PARAMETER Pattern
  Optional Vitest filter pattern to run a subset of tests (passed to --filter).
.PARAMETER SkipRun
  Skip running Vitest; still create summary and ensure directories.
#>

[CmdletBinding()]
param(
  [Parameter()] [string] $Pattern,
  [Parameter()] [switch] $SkipRun
)

$ErrorActionPreference = "Continue"
$OriginalEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = $PSScriptRoot
$frontendPath = Join-Path $root "frontend"
$resultsDir = Join-Path $root "test-results\frontend"
$outputFile = Join-Path $resultsDir "vitest_output.txt"
$summaryFile = Join-Path $resultsDir "summary.txt"

try {
  Write-Host "=== Frontend Test Runner (with Summary) ===" -ForegroundColor Cyan
  Write-Host "Working Directory: $PWD" -ForegroundColor Gray
  Write-Host "Results Directory: $resultsDir" -ForegroundColor Gray
  Write-Host "";

  # Ensure results directory exists
  New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

  Push-Location $frontendPath
  $env:SMS_ALLOW_DIRECT_VITEST = "1"

  $exitCode = 0
  if ($SkipRun) {
    Write-Host "Skipping vitest run (SkipRun flag set)." -ForegroundColor Yellow
    "Run skipped at $(Get-Date -Format o)" | Set-Content -Path $outputFile -Encoding UTF8
  } else {
    Write-Host "Running vitest..." -ForegroundColor Yellow
    $cmd = "npx vitest run --reporter=verbose"
    if ($Pattern) {
      $cmd = "$cmd --filter \"$Pattern\""
      Write-Host "Filter pattern: $Pattern" -ForegroundColor Gray
    }
    # Execute vitest and tee output to file
    # Use Start-Process to preserve exit code reliably across pipe/tee
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "pwsh"
    $psi.Arguments = "-NoProfile -Command $cmd"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $proc.Start() | Out-Null
    $stdOut = $proc.StandardOutput.ReadToEnd()
    $stdErr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    $exitCode = $proc.ExitCode

    # Write combined output to file and also echo a brief tail to console
    $combined = "OUTPUT:\n" + $stdOut + "\nERROR:\n" + $stdErr
    Set-Content -Path $outputFile -Value $combined -Encoding UTF8
    Write-Host "Vitest exit code: $exitCode" -ForegroundColor ($exitCode -eq 0 ? 'Green' : 'Red')
  }

  # Try to detect a summary line from output
  $detectedSummary = "(not detected)"
  if (Test-Path $outputFile) {
    $content = Get-Content -Path $outputFile -Raw
    $lines = $content -split "`r?`n"
    $possible = $lines | Where-Object { $_ -match '(?i)^(Tests|Test Suites|Suites|Files)\b' -or $_ -match '(?i)passed|failed|skipped' } | Select-Object -First 1
    if ($possible) { $detectedSummary = $possible.Trim() }
  }

  $summary = @()
  $summary += "Frontend Test Summary"
  $summary += "Timestamp (UTC): $(Get-Date -AsUTC -Format o)"
  $summary += "ExitCode: $exitCode"
  if ($Pattern) { $summary += "Filter: $Pattern" } else { $summary += "Filter: (none)" }
  $summary += "OutputFile: $outputFile"
  $summary += "DetectedSummary: $detectedSummary"
  $summaryText = ($summary -join "`n")
  Set-Content -Path $summaryFile -Value $summaryText -Encoding UTF8

  Write-Host "Summary written to: $summaryFile" -ForegroundColor Cyan
  exit $exitCode
}
catch {
  Write-Error "Error running frontend tests with summary: $_"
  exit 1
}
finally {
  Pop-Location
  [Console]::OutputEncoding = $OriginalEncoding
}