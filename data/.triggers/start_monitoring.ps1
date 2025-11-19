# Auto-generated monitoring trigger
$ErrorActionPreference = "Stop"

Write-Host "Starting monitoring stack from trigger..."

try {
    $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $projectRoot
    Write-Host "Project root: $projectRoot"
    docker compose -f docker-compose.monitoring.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Monitoring stack started successfully"
        Remove-Item $PSCommandPath -Force
    } else {
        Write-Host "❌ Failed to start monitoring stack (exit code: $LASTEXITCODE)"
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_"
    exit 1
}
