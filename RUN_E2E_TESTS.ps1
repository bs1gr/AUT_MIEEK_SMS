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
    [string]$SpecFile
)

$ErrorActionPreference = "Continue"
$RootPath = "D:\SMS\student-management-system"
$FrontendPath = "$RootPath\frontend"

Write-Host "=== E2E Test Execution ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan

# Step 1: Check if services are running
Write-Host "`nStep 1: Checking service status..." -ForegroundColor Yellow
$backendRunning = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded

# Check frontend on 8080 (NATIVE.ps1 default) or 5173 (Vite default)
$frontendPort = 8080
$workingHost = "127.0.0.1"
$frontendRunning = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -WarningAction SilentlyContinue).TcpTestSucceeded

if (-not $frontendRunning) {
    $frontendRunning = (Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($frontendRunning) { $frontendPort = 5173 }
}

Write-Host "  Backend (port 8000): $(if ($backendRunning) { '✅ Running' } else { '❌ Not running' })"
Write-Host "  Frontend (port $frontendPort): $(if ($frontendRunning) { '✅ Running' } else { '❌ Not running' })"

if (-not $backendRunning) {
    Write-Host "`nStarting Backend..." -ForegroundColor Yellow
    & "$RootPath\NATIVE.ps1" -Backend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ ERROR: Failed to start Backend via NATIVE.ps1" -ForegroundColor Red
        exit 1
    }

    # Wait for backend to start
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
    Write-Host "`n✅ Backend started." -ForegroundColor Green
}

if (-not $frontendRunning) {
    Write-Host "`nStarting Frontend..." -ForegroundColor Yellow
    & "$RootPath\NATIVE.ps1" -Frontend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ ERROR: Failed to start Frontend via NATIVE.ps1" -ForegroundColor Red
        exit 1
    }

    # Wait for frontend to start
    $retries = 0
    $detected = $false
    $pidFile = "$RootPath\.frontend.pid"

    # Helper for fast port checking (IPv4/IPv6/Localhost)
    function Test-PortFast {
        param([string]$HostName, [int]$Port)
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $connect = $tcp.BeginConnect($HostName, $Port, $null, $null)
            $success = $connect.AsyncWaitHandle.WaitOne(200, $false)
            if ($success) {
                try { $tcp.EndConnect($connect) } catch {}
            }
            $tcp.Close()
            $tcp.Dispose()
            return $success
        } catch {
            return $false
        }
    }

    while (-not $detected) {
        # Fail fast if process died
        if (Test-Path $pidFile) {
            $pidVal = Get-Content $pidFile -ErrorAction SilentlyContinue
            if ($pidVal -and -not (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) {
                Write-Host "`n❌ ERROR: Frontend process (PID $pidVal) exited unexpectedly." -ForegroundColor Red
                Write-Host "Check the frontend terminal window for errors." -ForegroundColor Yellow
                exit 1
            }
        }

        # Check common bindings (IPv4 and Localhost/IPv6)
        if (Test-PortFast "127.0.0.1" 8080) { $frontendPort = 8080; $detected = $true }
        elseif (Test-PortFast "localhost" 8080) { $frontendPort = 8080; $detected = $true }
        elseif (Test-PortFast "::1" 8080) { $frontendPort = 8080; $detected = $true }

        if (-not $detected) {
            Start-Sleep -Seconds 1
            $retries++
            if ($retries -gt 90) {
                Write-Host "`n❌ ERROR: Frontend failed to start on port 8080 within 90 seconds." -ForegroundColor Red
                try { netstat -ano | Select-String ":8080" | Out-String | Write-Host } catch {}
                exit 1
            }
        }
        Write-Host "." -NoNewline
    }
    Write-Host "`n✅ Frontend started on port $frontendPort." -ForegroundColor Green

    # HTTP Smoke Test: Ensure server is actually serving content (not just port open)
    Write-Host "Verifying HTTP availability..." -NoNewline
    $httpReady = $false
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    while ($timer.Elapsed.TotalSeconds -lt 30) {
        # Try 127.0.0.1 first (more reliable on Windows), then localhost
        foreach ($hostName in @("127.0.0.1", "localhost")) {
            try {
                $req = [System.Net.WebRequest]::Create("http://$hostName`:$frontendPort")
                $req.Method = "HEAD"
                $req.Timeout = 1000
                $resp = $req.GetResponse()
                if ($resp.StatusCode -eq "OK") {
                    $httpReady = $true
                    $workingHost = $hostName
                    $resp.Close()
                    break
                }
                $resp.Close()
            } catch {}
        }
        if ($httpReady) { break }
        Start-Sleep -Milliseconds 500
        Write-Host "." -NoNewline
    }

    if ($httpReady) {
        Write-Host " OK (http://$workingHost`:$frontendPort)" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Warning: HTTP check timed out. Tests might fail." -ForegroundColor Yellow
    }
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
