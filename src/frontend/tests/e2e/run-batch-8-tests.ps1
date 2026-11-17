Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Batch 8 Verification (Performance & Search)   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory for npx playwright
$ScriptRoot = $PSScriptRoot
# Navigate up from tests/e2e to frontend
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

# The saved-search and student-list spec files that ran here first were deleted in November
# 2026: they described a page and a table the application does not have.

# Run Performance Benchmark
Write-Host "`n👉 Running Performance Benchmark..." -ForegroundColor Yellow
npx playwright test performance-benchmark.spec.ts
$benchmarkStatus = $LASTEXITCODE

Pop-Location

Write-Host "`n--------------------------------------------------" -ForegroundColor Gray

if ($benchmarkStatus -eq 0) {
    Write-Host "✅ ALL BATCH 8 TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "Benchmark:    $benchmarkStatus" -ForegroundColor Gray
}
