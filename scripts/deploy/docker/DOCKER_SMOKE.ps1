# Quick smoke test for Docker deployment
param(
    [string]$BaseUrl = "http://localhost:8080"
)

Write-Host "Checking health at $BaseUrl/health ..." -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($resp.StatusCode -ne 200) {
        Write-Host "Health endpoint returned $($resp.StatusCode)" -ForegroundColor Yellow
    } else {
        $json = $null
        try { $json = ($resp.Content | ConvertFrom-Json) } catch {}
        if ($json -and $json.status -eq 'healthy') {
            Write-Host "OK: Backend healthy (uptime: $($json.uptime)s)" -ForegroundColor Green
        } else {
            Write-Host "Health OK but unexpected body" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ERROR: Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Opening app..." -ForegroundColor Green
Start-Process $BaseUrl
