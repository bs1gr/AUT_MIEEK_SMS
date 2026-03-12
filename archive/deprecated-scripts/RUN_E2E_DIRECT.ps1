#!/usr/bin/env pwsh
<#
.SYNOPSIS
Archived direct E2E runner (historical)
.DESCRIPTION
This script was superseded on March 12, 2026 by `RUN_E2E_TESTS.ps1 -Direct`
and is retained only for historical traceability.
#>
param([string]$SpecFile)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RepoRoot "frontend"

if (-not (Test-Path $FrontendDir)) {
    Write-Error "Frontend directory not found at $FrontendDir"
    exit 1
}

Set-Location $FrontendDir

# Hardcode the URL since we know NATIVE.ps1 uses 8080
$env:PLAYWRIGHT_BASE_URL = "http://localhost:8080"

Write-Host "=== Direct E2E Test Execution (Archived) ===" -ForegroundColor Green
Write-Host "Superseded by: .\RUN_E2E_TESTS.ps1 -Direct" -ForegroundColor Yellow
Write-Host "Target: $env:PLAYWRIGHT_BASE_URL" -ForegroundColor Cyan
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

if ($SpecFile) {
    if (-not (Test-Path $SpecFile)) {
        Write-Warning "File not found: $SpecFile"
    }
    npx playwright test "$SpecFile" --reporter=list
} else {
    npx playwright test --reporter=list
}
