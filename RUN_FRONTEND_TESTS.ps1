#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
  Canonical frontend Vitest runner.
.DESCRIPTION
  Runs frontend tests with UTF-8 console handling and optional summary capture.
  Replaces the old RUN_FRONTEND_TESTS_SIMPLE.ps1 and
  RUN_FRONTEND_TESTS_SUMMARY.ps1 wrappers.
.PARAMETER Pattern
  Optional test pattern or file fragment to pass through to Vitest.
.PARAMETER Mode
  Output mode. Verbose echoes full test output to the console. Summary writes the
  full output to disk and prints only the condensed summary to the console.
.PARAMETER SkipRun
  Skip executing Vitest and only refresh output/summary artifacts.
#>

[CmdletBinding()]
param(
  [Parameter()] [string] $Pattern,
  [Parameter()] [ValidateSet('Verbose', 'Summary')] [string] $Mode = 'Verbose',
  [Parameter()] [switch] $SkipRun
)

$ErrorActionPreference = 'Stop'
$OriginalEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = $PSScriptRoot
$frontendPath = Join-Path $root 'frontend'
$resultsDir = Join-Path $root 'test-results\frontend'
$outputFile = Join-Path $resultsDir 'vitest_output.txt'
$summaryFile = Join-Path $resultsDir 'summary.txt'

try {
  Write-Host "=== Frontend Test Runner ===" -ForegroundColor Cyan
  Write-Host "Mode: $Mode" -ForegroundColor Gray
  Write-Host "Results Directory: $resultsDir" -ForegroundColor Gray
  if ($Pattern) {
    Write-Host "Pattern: $Pattern" -ForegroundColor Gray
  }
  Write-Host ''

  New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
  Push-Location $frontendPath

  $env:SMS_ALLOW_DIRECT_VITEST = '1'

  $exitCode = 0
  if ($SkipRun) {
    Write-Host 'Skipping Vitest execution (-SkipRun active).' -ForegroundColor Yellow
    "Run skipped at $(Get-Date -Format o)" | Set-Content -Path $outputFile -Encoding UTF8
  } else {
    $npmArgs = @('--prefix', 'frontend', 'run', 'test', '--')
    if ($Pattern) {
      $npmArgs += $Pattern
    }
    $npmArgs += '--reporter=verbose'

    Write-Host "Running: npm $($npmArgs -join ' ')" -ForegroundColor Yellow

    $npmExecutable = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npmExecutable) {
      $npmExecutable = (Get-Command npm -ErrorAction Stop).Source
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $npmExecutable
    foreach ($arg in $npmArgs) {
      [void]$psi.ArgumentList.Add($arg)
    }
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.WorkingDirectory = $root

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $proc.Start() | Out-Null
    $stdOut = $proc.StandardOutput.ReadToEnd()
    $stdErr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    $exitCode = $proc.ExitCode

    $combined = "OUTPUT:`n$stdOut`nERROR:`n$stdErr"
    Set-Content -Path $outputFile -Value $combined -Encoding UTF8

    if ($Mode -eq 'Verbose') {
      if ($stdOut) { Write-Host $stdOut }
      if ($stdErr) { Write-Host $stdErr }
    }

    Write-Host "Vitest exit code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { 'Green' } else { 'Red' })
  }

  $detectedSummary = '(not detected)'
  if (Test-Path $outputFile) {
    $content = Get-Content -Path $outputFile -Raw
    $lines = $content -split "`r?`n"
    $possible = $lines |
      Where-Object { $_ -match '(?i)^(Tests|Test Suites|Suites|Files)\b' -or $_ -match '(?i)passed|failed|skipped' } |
      Select-Object -First 1
    if ($possible) {
      $detectedSummary = $possible.Trim()
    }
  }

  $summary = @(
    'Frontend Test Summary',
    "Timestamp (UTC): $(Get-Date -AsUTC -Format o)",
    "ExitCode: $exitCode",
    "Mode: $Mode",
    $(if ($Pattern) { "Filter: $Pattern" } else { 'Filter: (none)' }),
    "OutputFile: $outputFile",
    "DetectedSummary: $detectedSummary"
  )
  Set-Content -Path $summaryFile -Value ($summary -join "`n") -Encoding UTF8

  Write-Host "Summary written to: $summaryFile" -ForegroundColor Cyan
  if ($Mode -eq 'Summary') {
    Write-Host "Detected summary: $detectedSummary" -ForegroundColor Cyan
  }

  exit $exitCode
}
catch {
  Write-Error "Error running frontend tests: $_"
  exit 1
}
finally {
  Pop-Location
  [Console]::OutputEncoding = $OriginalEncoding
}
