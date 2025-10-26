# Stop and remove Docker Compose for SMS
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Stopping containers..." -ForegroundColor Yellow
$proc = Start-Process -FilePath "docker" -ArgumentList @("compose","down") -NoNewWindow -PassThru
$proc.WaitForExit()

if ($proc.ExitCode -ne 0) {
    Write-Host "Docker compose down failed (exit $($proc.ExitCode))" -ForegroundColor Red
    exit $proc.ExitCode
}

Write-Host "Done." -ForegroundColor Green
