# Auto-generated monitoring trigger
$ErrorActionPreference = "Stop"

Write-Host "Starting monitoring stack from trigger..."

try {
    # Navigate to project root (assumes trigger is in data/.triggers)
    $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $projectRoot
    
    Write-Host "Project root: $projectRoot"
    
    # Start monitoring stack
    docker compose -f docker-compose.monitoring.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Monitoring stack started successfully"
        # Clean up trigger file
        Remove-Item $PSCommandPath -Force
    } else {
        Write-Host "❌ Failed to start monitoring stack (exit code: $LASTEXITCODE)"
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_"
    exit 1
}
