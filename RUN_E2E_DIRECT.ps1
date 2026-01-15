#!/usr/bin/env pwsh
<#
.SYNOPSIS
Run E2E tests directly (Bypasses service checks)
#>
param([string]$SpecFile)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir "frontend"

if (-not (Test-Path $FrontendDir)) {
    Write-Error "Frontend directory not found at $FrontendDir"
    exit 1
}

Set-Location $FrontendDir

# Hardcode the URL since we know NATIVE.ps1 uses 8080
$env:PLAYWRIGHT_BASE_URL = "http://localhost:8080"

Write-Host "=== Direct E2E Test Execution ===" -ForegroundColor Green
Write-Host "Target: $env:PLAYWRIGHT_BASE_URL" -ForegroundColor Cyan
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

if ($SpecFile) {
    # Ensure we pass a path Playwright can resolve
    if (-not (Test-Path $SpecFile)) {
        Write-Warning "File not found: $SpecFile"
    }
    npx playwright test "$SpecFile" --reporter=list
} else {
    npx playwright test --reporter=list
}
