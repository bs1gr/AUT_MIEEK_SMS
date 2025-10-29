# Terminal Health Check
# Quick script to validate terminal is working correctly

param(
    [switch]$Verbose
)

Write-Host "Terminal Health Check..." -ForegroundColor Cyan

$allPassed = $true

# Test 1: Simple output
try {
    if ($Verbose) { Write-Host "  Test 1: Simple output..." -ForegroundColor Gray }
    Write-Output "TEST" | Out-Null
    if ($Verbose) { Write-Host "  ✓ Passed" -ForegroundColor Green }
} catch {
    Write-Host "  ✗ FAILED: Simple output" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Variable assignment
try {
    if ($Verbose) { Write-Host "  Test 2: Variable assignment..." -ForegroundColor Gray }
    $testVar = "test"
    if ($testVar -ne "test") { throw "Variable assignment failed" }
    if ($Verbose) { Write-Host "  ✓ Passed" -ForegroundColor Green }
} catch {
    Write-Host "  ✗ FAILED: Variable assignment" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: Command execution
try {
    if ($Verbose) { Write-Host "  Test 3: Command execution..." -ForegroundColor Gray }
    $location = Get-Location
    if (-not $location) { throw "Get-Location failed" }
    if ($Verbose) { Write-Host "  ✓ Passed" -ForegroundColor Green }
} catch {
    Write-Host "  ✗ FAILED: Command execution" -ForegroundColor Red
    $allPassed = $false
}

# Test 4: Pipeline
try {
    if ($Verbose) { Write-Host "  Test 4: Pipeline..." -ForegroundColor Gray }
    $result = "test" | Select-Object -First 1
    if (-not $result) { throw "Pipeline failed" }
    if ($Verbose) { Write-Host "  ✓ Passed" -ForegroundColor Green }
} catch {
    Write-Host "  ✗ FAILED: Pipeline" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
if ($allPassed) {
    Write-Host "✓ Terminal is healthy" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Terminal may be corrupted - consider using a fresh terminal" -ForegroundColor Red
    exit 1
}
