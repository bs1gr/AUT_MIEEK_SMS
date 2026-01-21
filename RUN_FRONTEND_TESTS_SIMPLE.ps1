#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Simple frontend test runner that captures output properly
.DESCRIPTION
    Runs vitest in frontend directory with proper output capture
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
$OriginalEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Write-Host "=== Frontend Test Runner ===" -ForegroundColor Cyan
    Write-Host "Working Directory: $PWD" -ForegroundColor Gray
    Write-Host ""

    # Navigate to frontend
    Push-Location "$PSScriptRoot\frontend"

    Write-Host "Running vitest..." -ForegroundColor Yellow
    Write-Host ""

    # Set environment variable to allow direct vitest
    $env:SMS_ALLOW_DIRECT_VITEST = "1"

    # Run vitest with run mode (no watch)
    & npx vitest run --reporter=verbose

    $exitCode = $LASTEXITCODE

    Write-Host ""
    Write-Host "=== Test Run Complete ===" -ForegroundColor Cyan
    Write-Host "Exit Code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })

    exit $exitCode
}
catch {
    Write-Error "Error running tests: $_"
    exit 1
}
finally {
    Pop-Location
    [Console]::OutputEncoding = $OriginalEncoding
}
