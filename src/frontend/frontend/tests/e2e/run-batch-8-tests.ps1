Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Batch 8 Verification (Performance & Search)   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory for npx playwright
$ScriptRoot = $PSScriptRoot
# Navigate up from tests/e2e to frontend
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

# 1. Run Saved Search Authorization Tests
Write-Host "`n👉 Running Saved Search Tests..." -ForegroundColor Yellow
npx playwright test saved-search.spec.ts
$savedSearchStatus = $LASTEXITCODE

# 2. Run Student List (Virtual Scroll) Tests
Write-Host "`n👉 Running Student List Tests..." -ForegroundColor Yellow
npx playwright test student-list.spec.ts
$studentListStatus = $LASTEXITCODE

# 3. Run Performance Benchmark
Write-Host "`n👉 Running Performance Benchmark..." -ForegroundColor Yellow
npx playwright test performance-benchmark.spec.ts
$benchmarkStatus = $LASTEXITCODE

Pop-Location

Write-Host "`n--------------------------------------------------" -ForegroundColor Gray

if ($savedSearchStatus -eq 0 -and $studentListStatus -eq 0 -and $benchmarkStatus -eq 0) {
    Write-Host "✅ ALL BATCH 8 TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "Saved Search: $savedSearchStatus" -ForegroundColor Gray
    Write-Host "Student List: $studentListStatus" -ForegroundColor Gray
    Write-Host "Benchmark:    $benchmarkStatus" -ForegroundColor Gray
}
