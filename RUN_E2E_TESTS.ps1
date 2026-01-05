#!/usr/bin/env pwsh
<#
.SYNOPSIS
Run E2E tests for notifications feature
.DESCRIPTION
Starts services and runs Playwright E2E tests
#>

$ErrorActionPreference = "Continue"
$RootPath = "D:\SMS\student-management-system"
$FrontendPath = "$RootPath\frontend"

Write-Host "=== E2E Test Execution for Notifications ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan

# Step 1: Check if services are running
Write-Host "`nStep 1: Checking service status..." -ForegroundColor Yellow
$backendRunning = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded
$frontendRunning = (Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue).TcpTestSucceeded

Write-Host "  Backend (port 8000): $(if ($backendRunning) { '✅ Running' } else { '❌ Not running' })"
Write-Host "  Frontend (port 5173): $(if ($frontendRunning) { '✅ Running' } else { '❌ Not running' })"

# Step 2: Run E2E tests
Write-Host "`nStep 2: Starting E2E tests..." -ForegroundColor Yellow
Set-Location $FrontendPath

try {
    Write-Host "  Running: npx playwright test tests/e2e/notifications.spec.ts" -ForegroundColor Cyan
    $output = & npx playwright test tests/e2e/notifications.spec.ts --reporter=list 2>&1

    Write-Host "`n=== Test Results ===" -ForegroundColor Green
    Write-Host $output

    # Check results
    if ($output -match "(\d+) passed") {
        $passed = [int]($output | Select-String "(\d+) passed" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        Write-Host "`n✅ E2E Tests Passed: $passed" -ForegroundColor Green
    } elseif ($output -match "(\d+) failed") {
        $failed = [int]($output | Select-String "(\d+) failed" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        Write-Host "`n❌ E2E Tests Failed: $failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running tests: $_" -ForegroundColor Red
}

Write-Host "`nE2E Test execution complete" -ForegroundColor Green
