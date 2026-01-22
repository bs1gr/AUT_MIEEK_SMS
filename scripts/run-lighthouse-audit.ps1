param([string]$Url = "http://localhost:8080")

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Running Lighthouse PWA Audit                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Target: $Url" -ForegroundColor Gray

if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "`nStarting Lighthouse..." -ForegroundColor Yellow
    # Run Lighthouse with PWA category only and open report
    npx lighthouse $Url --only-categories=pwa --view
} else {
    Write-Error "npx not found. Please install Node.js to run Lighthouse."
}
