Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running PWA Compliance Audit (Playwright)             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Ensure we are in the frontend directory for npx playwright
$ScriptRoot = $PSScriptRoot
$FrontendPath = Join-Path $ScriptRoot "..\.."
Push-Location $FrontendPath

Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Gray

# Run the PWA tests
Write-Host "`n👉 Verifying PWA features..." -ForegroundColor Yellow
npx playwright test pwa.spec.ts
$testStatus = $LASTEXITCODE

Pop-Location

if ($testStatus -eq 0) {
    Write-Host "`n✅ PWA AUDIT PASSED" -ForegroundColor Green
} else {
    Write-Host "`n❌ PWA AUDIT FAILED" -ForegroundColor Red
}
