Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Batch 9 Verification (Security & Resilience)  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory for npx playwright
$ScriptRoot = $PSScriptRoot
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

# Run the resilience tests
Write-Host "`n👉 Running Rate Limiting & Error Recovery Tests..." -ForegroundColor Yellow
npx playwright test student-resilience.spec.ts
$testStatus = $LASTEXITCODE

Pop-Location

if ($testStatus -eq 0) {
    Write-Host "`n✅ BATCH 9 TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "`n❌ BATCH 9 TESTS FAILED" -ForegroundColor Red
}
