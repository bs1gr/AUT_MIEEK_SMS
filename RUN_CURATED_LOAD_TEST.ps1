# Curated Load Test Runner
# Runs focused performance tests with valid inputs to get clean baseline metrics

param(
    [ValidateSet('curated', 'bottleneck', 'both')]
    [string]$Scenario = 'curated',

    [int]$Users = 30,
    [int]$SpawnRate = 3,
    [int]$Duration = 60,

    [switch]$NoWeb,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Curated Load Test Runner              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectRoot = $PSScriptRoot
$loadTestDir = Join-Path $projectRoot "load_tests"
$resultsDir = Join-Path $projectRoot "test-results" "load-tests"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Ensure results directory exists
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
}

# Select user class based on scenario
$userClass = switch ($Scenario) {
    'curated' { 'CuratedUser' }
    'bottleneck' { 'OptimizationTargetUser' }
    'both' { 'CuratedUser,OptimizationTargetUser' }
}

Write-Host "📊 Test Configuration:" -ForegroundColor Yellow
Write-Host "   Scenario: $Scenario ($userClass)"
Write-Host "   Users: $Users"
Write-Host "   Spawn rate: $SpawnRate users/sec"
Write-Host "   Duration: $Duration seconds"
Write-Host "   Results: $resultsDir"
Write-Host ""

# Check if native servers are running
Write-Host "🔍 Checking native servers..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend server responding on port 8000" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server not responding on port 8000" -ForegroundColor Red
    Write-Host "   Run: .\NATIVE.ps1 -Start" -ForegroundColor Yellow
    exit 1
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend server responding on port 5173" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend server not responding (optional for API tests)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting load test..." -ForegroundColor Green
Write-Host ""

# Build Locust command
$locustFile = Join-Path $loadTestDir "curated_scenarios.py"
$locustArgs = @(
    "-f", $locustFile,
    "--host", "http://localhost:8000",
    "--users", $Users,
    "--spawn-rate", $SpawnRate,
    "--run-time", "${Duration}s",
    "--html", (Join-Path $resultsDir "report_${Scenario}_${timestamp}.html"),
    "--csv", (Join-Path $resultsDir "results_${Scenario}_${timestamp}")
)

# Add user class filter if specific scenario selected
if ($Scenario -ne 'both') {
    $locustArgs += "--tags", $Scenario
}

if ($NoWeb) {
    $locustArgs += "--headless"
} else {
    Write-Host "📈 Web UI available at: http://localhost:8089" -ForegroundColor Cyan
    Write-Host "   (Press Ctrl+C to stop)" -ForegroundColor Yellow
    Write-Host ""
}

if ($Verbose) {
    $locustArgs += "--loglevel", "DEBUG"
}

# Run Locust
try {
    & locust @locustArgs

    Write-Host ""
    Write-Host "✅ Load test completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Results saved to:" -ForegroundColor Cyan
    Get-ChildItem $resultsDir -Filter "*${timestamp}*" | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor White
    }
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Load test failed: $_" -ForegroundColor Red
    exit 1
}

# Analyze results
Write-Host "📈 Quick Analysis:" -ForegroundColor Yellow
Write-Host ""

$csvStats = Join-Path $resultsDir "results_${Scenario}_${timestamp}_stats.csv"
if (Test-Path $csvStats) {
    Write-Host "Performance Summary (from CSV):" -ForegroundColor Cyan
    Get-Content $csvStats | Select-Object -First 20
    Write-Host ""
}

Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review HTML report: test-results/load-tests/report_${Scenario}_${timestamp}.html"
Write-Host "   2. Analyze CSV files for detailed metrics"
Write-Host "   3. Compare p95/p99 times against <500ms SLA target"
Write-Host "   4. Identify endpoints needing optimization"
Write-Host ""
