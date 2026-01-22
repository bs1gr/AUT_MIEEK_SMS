Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Saved Search Authorization E2E Test           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Run the specific test file
npx playwright test saved-search.spec.ts --headed

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Authorization tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Authorization tests failed." -ForegroundColor Red
}
