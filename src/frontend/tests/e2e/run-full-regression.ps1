Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Full Frontend Regression Suite (v1.17.4)      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory
$ScriptRoot = $PSScriptRoot
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Starting E2E Tests..." -ForegroundColor Yellow

# The saved-search and student-list spec files that ran here first were deleted in November
# 2026: they described a page and a table the application does not have.

# 1. Performance Benchmark (Batch 8)
Write-Host "`n[1/2] Running Benchmarks..." -ForegroundColor Cyan
npx playwright test performance-benchmark.spec.ts
$perfStatus = $LASTEXITCODE

# 2. Resilience & Security (Batch 9)
Write-Host "`n[2/2] Testing Resilience & Security..." -ForegroundColor Cyan
npx playwright test student-resilience.spec.ts
$secStatus = $LASTEXITCODE

Pop-Location

Write-Host "`n--------------------------------------------------" -ForegroundColor Gray
if ($perfStatus -eq 0 -and $secStatus -eq 0) {
    Write-Host "✅ ALL REGRESSION TESTS PASSED - READY FOR RELEASE" -ForegroundColor Green
} else {
    Write-Host "❌ REGRESSION FAILED" -ForegroundColor Red
}
