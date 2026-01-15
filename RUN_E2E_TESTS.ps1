#!/usr/bin/env pwsh
<#
.SYNOPSIS
Run E2E tests
.DESCRIPTION
Starts services and runs Playwright E2E tests
.PARAMETER SpecFile
Optional path to specific test file (e.g., tests/e2e/feature_127.spec.ts)
#>

param(
    [string]$SpecFile,
    [switch]$SkipChecks
)

$ErrorActionPreference = "Continue"
$RootPath = "D:\SMS\student-management-system"
$FrontendPath = "$RootPath\frontend"

Write-Host "=== E2E Test Execution ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan

# Helper to verify HTTP service is actually serving content (avoids zombie processes)
function Test-Http {
    param([int]$Port)
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($null -ne $response -and $response.StatusCode -in @(200, 304)) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

if ($SkipChecks) {
    Write-Host "Skipping service checks (-SkipChecks active)..." -ForegroundColor Yellow
    $frontendPort = 8080
    $workingHost = "127.0.0.1"
} else {
# Step 1: Ensure services are running using NATIVE.ps1
Write-Host "`nStep 1: Ensuring services are running..." -ForegroundColor Yellow

# Show current status
& "$RootPath\NATIVE.ps1" -Status

# Start services (NATIVE.ps1 handles idempotency)
Write-Host "Starting services via NATIVE.ps1..." -ForegroundColor Cyan
& "$RootPath\NATIVE.ps1" -Start
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services via NATIVE.ps1" -ForegroundColor Red
    exit 1
}

$frontendPort = 8080
$workingHost = "127.0.0.1"

# Wait for Backend
Write-Host "Waiting for Backend (8000)..." -NoNewline
$retries = 0
while (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded) {
    Start-Sleep -Seconds 1
    $retries++
    if ($retries -gt 60) {
        Write-Host "`n❌ ERROR: Backend failed to start on port 8000 within 60 seconds." -ForegroundColor Red
        exit 1
    }
    Write-Host "." -NoNewline
}
Write-Host " OK" -ForegroundColor Green

# Wait for Frontend
Write-Host "Waiting for Frontend (8080)..." -NoNewline
$retries = 0
while (-not (Test-Http 8080)) {
    Start-Sleep -Seconds 1
    $retries++
    if ($retries -gt 90) {
        Write-Host "`n❌ ERROR: Frontend failed to start on port 8080 within 90 seconds." -ForegroundColor Red
        exit 1
    }
    Write-Host "." -NoNewline
}
Write-Host " OK" -ForegroundColor Green
}

# Step 2: Run E2E tests
Write-Host "`nStep 2: Starting E2E tests..." -ForegroundColor Yellow
Set-Location $FrontendPath

# Ensure Playwright targets the correct local port
$env:PLAYWRIGHT_BASE_URL = "http://$workingHost`:$frontendPort"

try {
    if ($SpecFile) {
        Write-Host "  Running: npx playwright test $SpecFile" -ForegroundColor Cyan
        $output = & npx playwright test $SpecFile --reporter=list 2>&1
    } else {
        Write-Host "  Running: npx playwright test (All)" -ForegroundColor Cyan
        $output = & npx playwright test --reporter=list 2>&1
    }

    Write-Host "`n=== Test Results ===" -ForegroundColor Green
    Write-Host $output

    # Check results
    $outputStr = $output | Out-String
    if ($outputStr -match "(\d+) passed") {
        $passed = $matches[1]
        Write-Host "`n✅ E2E Tests Passed: $passed" -ForegroundColor Green
    }
    if ($outputStr -match "(\d+) failed") {
        $failed = $matches[1]
        Write-Host "`n❌ E2E Tests Failed: $failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running tests: $_" -ForegroundColor Red
}

Write-Host "`nE2E Test execution complete" -ForegroundColor Green
