Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Full Frontend Regression Suite (v1.17.4)      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory
$ScriptRoot = $PSScriptRoot
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Starting E2E Tests..." -ForegroundColor Yellow

# 1. Saved Search Authorization (Batch 7/8)
Write-Host "`n[1/4] Testing Authorization..." -ForegroundColor Cyan
npx playwright test saved-search.spec.ts
$authStatus = $LASTEXITCODE

# 2. Student List Virtualization (Batch 8)
Write-Host "`n[2/4] Testing Virtualization..." -ForegroundColor Cyan
npx playwright test student-list.spec.ts
$virtStatus = $LASTEXITCODE

# 3. Performance Benchmark (Batch 8)
Write-Host "`n[3/4] Running Benchmarks..." -ForegroundColor Cyan
npx playwright test performance-benchmark.spec.ts
$perfStatus = $LASTEXITCODE

# 4. Resilience & Security (Batch 9)
Write-Host "`n[4/4] Testing Resilience & Security..." -ForegroundColor Cyan
npx playwright test student-resilience.spec.ts
$secStatus = $LASTEXITCODE

Pop-Location

Write-Host "`n--------------------------------------------------" -ForegroundColor Gray
if ($authStatus -eq 0 -and $virtStatus -eq 0 -and $perfStatus -eq 0 -and $secStatus -eq 0) {
    Write-Host "✅ ALL REGRESSION TESTS PASSED - READY FOR RELEASE" -ForegroundColor Green
} else {
    Write-Host "❌ REGRESSION FAILED" -ForegroundColor Red
}
