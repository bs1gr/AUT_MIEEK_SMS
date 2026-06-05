#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 5 Stream 3 - Day 1 Baseline Measurement Startup Script
.DESCRIPTION
Prepares and starts the backend for baseline load testing.
Creates 5 baseline performance measurements.
.PARAMETER Action
  start   - Start backend and prepare for testing
  measure - Run 5 baseline load tests
  analyze - Analyze baseline results
  all     - Do all of the above
.EXAMPLE
  .\scripts\PHASE5_BASELINE_START.ps1 -Action all
#>

param(
    [ValidateSet('start', 'measure', 'analyze', 'all')]
    [string]$Action = 'all'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Colors for output
$Color_Info = 'Cyan'
$Color_Success = 'Green'
$Color_Warning = 'Yellow'
$Color_Error = 'Red'

function Write-Title {
    param([string]$Message)
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor $Color_Info
    Write-Host "║ $($Message.PadRight(66)) ║" -ForegroundColor $Color_Info
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor $Color_Info
    Write-Host ""
}

function Write-Section {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor $Color_Info
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Color_Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor $Color_Warning
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Color_Error
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

Write-Title "Phase 5 Stream 3 - Baseline Measurement Setup"

Write-Section "Verifying environment..."

# Check Python
try {
    $python = python --version 2>&1
    Write-Success "Python found: $python"
} catch {
    Write-Error "Python not found. Please install Python 3.11+"
    exit 1
}

# Check virtual environment
if (Test-Path '.venv\Scripts\Activate.ps1') {
    Write-Success "Virtual environment found at .venv"
    & .\.venv\Scripts\Activate.ps1
} else {
    Write-Error "Virtual environment not found. Run: python -m venv .venv"
    exit 1
}

# Check load test script
if (-not (Test-Path 'scripts\run_load_tests.py')) {
    Write-Error "Load test script not found at scripts/run_load_tests.py"
    exit 1
}
Write-Success "Load test script found"

# Create baseline metrics directory
if (-not (Test-Path 'baseline-metrics')) {
    mkdir baseline-metrics | Out-Null
    Write-Success "Created baseline-metrics directory"
}

# ============================================================================
# ACTION: START BACKEND
# ============================================================================

if ($Action -in 'start', 'all') {
    Write-Title "Phase 1: Starting Backend Server"

    Write-Section "Starting backend on http://127.0.0.1:8000..."
    Write-Host ""

    # Check if uvicorn is installed
    try {
        $uvicornCheck = python -m pip list 2>&1 | Select-String "uvicorn"
        if (-not $uvicornCheck) {
            Write-Warning "uvicorn not found. Installing..."
            python -m pip install uvicorn -q
        }
    } catch {
        Write-Warning "Could not verify uvicorn installation. Attempting to proceed..."
    }

    # Start backend using uvicorn (proper module invocation)
    $backendProcess = Start-Process `
        -FilePath python `
        -ArgumentList '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000' `
        -PassThru `
        -NoNewWindow

    Write-Success "Backend process started (PID: $($backendProcess.Id))"
    Write-Host "  Command: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
    Write-Host ""

    # Wait for backend to start and check health
    Write-Section "Waiting for backend to initialize..."
    $maxAttempts = 40
    $attempt = 0
    $backendReady = $false

    while ($attempt -lt $maxAttempts -and -not $backendReady) {
        $attempt++
        Start-Sleep -Seconds 1

        try {
            $response = Invoke-WebRequest `
                -Uri 'http://127.0.0.1:8000/health' `
                -Method GET `
                -TimeoutSec 2 `
                -ErrorAction SilentlyContinue

            if ($response.StatusCode -eq 200) {
                Write-Success "Backend is ready (health check passed)"
                $backendReady = $true
            }
        } catch {
            # Backend not ready yet
            if ($attempt % 10 -eq 0) {
                Write-Host "  Waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor Gray
            }
        }
    }

    if (-not $backendReady) {
        Write-Error "Backend failed to start after 40 seconds"
        Write-Host "Checking if process is still running..."

        try {
            $proc = Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Warning "Process is running but health check failed. Attempting to get detailed error..."
                Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}

        exit 1
    }

    Write-Success "Backend is ready for testing"
    Write-Host ""
    Write-Host "Backend Details:" -ForegroundColor $Color_Info
    Write-Host "  URL: http://127.0.0.1:8000"
    Write-Host "  Process ID: $($backendProcess.Id)"
    Write-Host "  Status: ✅ Running"
    Write-Host ""
    Write-Warning "⚠️ Keep this process running during the load tests!"
    Write-Host ""
}

# ============================================================================
# ACTION: RUN BASELINE MEASUREMENTS
# ============================================================================

if ($Action -in 'measure', 'all') {
    Write-Title "Phase 2: Running Baseline Load Tests (5 runs)"

    $testRuns = @(1, 2, 3, 4, 5)
    $results = @()

    foreach ($runNum in $testRuns) {
        Write-Section "Baseline Run #$runNum / 5"

        $outputFile = "baseline-metrics\baseline_run_$runNum.json"
        $startTime = Get-Date

        Write-Host "  Command: python scripts/run_load_tests.py"
        Write-Host "    --host http://127.0.0.1:8000"
        Write-Host "    --users 50"
        Write-Host "    --spawn-rate 10"
        Write-Host "    --duration 60"
        Write-Host "    --output $outputFile"
        Write-Host ""

        try {
            $output = & python scripts/run_load_tests.py `
                --host http://127.0.0.1:8000 `
                --users 50 `
                --spawn-rate 10 `
                --duration 60 `
                --output $outputFile 2>&1

            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds

            # Parse result from output
            if (Test-Path $outputFile) {
                $jsonContent = Get-Content $outputFile | ConvertFrom-Json
                $successRate = $jsonContent.success_rate_percent
                $totalRequests = $jsonContent.total_requests

                Write-Success "Run #$runNum completed in $([Math]::Round($duration, 1))s"
                Write-Host "  Requests: $totalRequests | Success Rate: $successRate%"

                $results += @{
                    run = $runNum
                    file = $outputFile
                    duration = $duration
                    successRate = $successRate
                    totalRequests = $totalRequests
                }
            } else {
                Write-Error "Run #$runNum failed - no output file created"
            }
        } catch {
            Write-Error "Run #$runNum failed: $_"
        }

        # Add delay between runs
        if ($runNum -lt 5) {
            Write-Host "  Cooling down..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }

    Write-Host ""
    Write-Success "All 5 baseline runs completed!"
}

# ============================================================================
# ACTION: ANALYZE RESULTS
# ============================================================================

if ($Action -in 'analyze', 'all') {
    Write-Title "Phase 3: Baseline Analysis"

    Write-Section "Processing baseline measurements..."

    # Collect all baseline files
    $baselineFiles = @(Get-ChildItem 'baseline-metrics\baseline_run_*.json' -ErrorAction SilentlyContinue)

    if ($baselineFiles.Count -eq 0) {
        Write-Warning "No baseline measurements found yet. Run with -Action measure first."
    } elseif ($baselineFiles.Count -lt 5) {
        Write-Warning "Only $($baselineFiles.Count) of 5 baseline runs found"
    } else {
        Write-Success "Found all 5 baseline measurements"

        # Parse and aggregate
        $aggregated = @{
            totalRequests = 0
            totalFailures = 0
            runCount = 0
            endpoints = @{}
        }

        foreach ($file in $baselineFiles) {
            $json = Get-Content $file | ConvertFrom-Json
            $aggregated.totalRequests += $json.total_requests
            $aggregated.totalFailures += $json.total_failures
            $aggregated.runCount += 1

            # Aggregate endpoint metrics
            foreach ($endpoint in $json.endpoint_metrics.PSObject.Properties) {
                $name = $endpoint.Name
                if (-not $aggregated.endpoints.ContainsKey($name)) {
                    $aggregated.endpoints[$name] = @{
                        p95_values = @()
                        p99_values = @()
                        avg_values = @()
                        failure_rates = @()
                    }
                }
                $aggregated.endpoints[$name].p95_values += $endpoint.Value.p95_response_time_ms
                $aggregated.endpoints[$name].p99_values += $endpoint.Value.p99_response_time_ms
                $aggregated.endpoints[$name].avg_values += $endpoint.Value.avg_response_time_ms
                $aggregated.endpoints[$name].failure_rates += $endpoint.Value.failure_rate_percent
            }
        }

        # Calculate averages
        Write-Host ""
        Write-Host "Baseline Summary (5 runs):" -ForegroundColor $Color_Info
        Write-Host ""
        Write-Host "Overall Metrics:"
        Write-Host "  Total Requests: $($aggregated.totalRequests)"

        if ($aggregated.totalRequests -gt 0) {
            $successRate = [Math]::Round((($aggregated.totalRequests - $aggregated.totalFailures) / $aggregated.totalRequests) * 100, 2)
        } else {
            $successRate = 0
        }

        Write-Host "  Overall Success Rate: $successRate%"
        Write-Host ""

        # Show per-endpoint averages
        Write-Host "Endpoint Performance (P95 average across 5 runs):" -ForegroundColor $Color_Info
        foreach ($endpoint in $aggregated.endpoints.Keys | Sort-Object) {
            $metrics = $aggregated.endpoints[$endpoint]
            $avgP95 = $metrics.p95_values | Measure-Object -Average | Select-Object -ExpandProperty Average
            $avgP99 = $metrics.p99_values | Measure-Object -Average | Select-Object -ExpandProperty Average
            $avgFailure = $metrics.failure_rates | Measure-Object -Average | Select-Object -ExpandProperty Average

            Write-Host ""
            Write-Host "  $endpoint"
            Write-Host "    P95: $([Math]::Round($avgP95, 2))ms (P99: $([Math]::Round($avgP99, 2))ms)"
            Write-Host "    Failure Rate: $([Math]::Round($avgFailure, 2))%"
        }

        # Save aggregated results
        $aggregatedFile = 'baseline-metrics\baseline_metrics_aggregated.json'
        $aggregated | ConvertTo-Json -Depth 10 | Set-Content $aggregatedFile
        Write-Success "Aggregated results saved to: $aggregatedFile"
    }
}

Write-Host ""
Write-Title "Phase 5 Stream 3 - Day 1 Complete ✅"

Write-Host "Next Steps:" -ForegroundColor $Color_Info
Write-Host "  1. Review baseline results in baseline-metrics/"
Write-Host "  2. Document findings in memory"
Write-Host "  3. Proceed to June 6 - E2E Execution Time Measurement"
Write-Host ""
Write-Host "For more details, see:" -ForegroundColor $Color_Info
Write-Host "  - baseline-metrics/baseline_run_*.json"
Write-Host "  - baseline-metrics/baseline_metrics_aggregated.json"
Write-Host ""
