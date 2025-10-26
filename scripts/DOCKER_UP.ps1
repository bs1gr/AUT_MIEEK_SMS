# Build and run Docker Compose for SMS
param(
    [switch]$Rebuild
)

Set-Location (Split-Path -Parent $PSScriptRoot)

if ($Rebuild) {
    Write-Host "Rebuilding images..." -ForegroundColor Cyan
    docker compose build
}

Write-Host "Starting containers..." -ForegroundColor Green
$proc = Start-Process -FilePath "docker" -ArgumentList @("compose","up","-d") -NoNewWindow -PassThru
$proc.WaitForExit()

if ($proc.ExitCode -ne 0) {
    Write-Host "Docker compose up failed (exit $($proc.ExitCode))" -ForegroundColor Red
    exit $proc.ExitCode
}

Write-Host "Opening app at http://localhost:8080" -ForegroundColor Yellow
Start-Process "http://localhost:8080"
