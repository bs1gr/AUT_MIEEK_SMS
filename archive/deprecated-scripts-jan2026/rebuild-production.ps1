# Rebuild and restart production deployment v1.15.2
# This script fixes the Alembic migration head conflict and restarts the container

Write-Host "=== Production Rebuild for v1.15.2 ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to docker directory
$dockerDir = "d:\SMS\student-management-system\docker"
$projectRoot = "d:\SMS\student-management-system"

Write-Host "Step 1: Check current container status..." -ForegroundColor Yellow
docker ps -a --filter "name=sms-app"
Write-Host ""

Write-Host "Step 2: Removing old container..." -ForegroundColor Yellow
docker stop sms-app 2>$null
docker rm sms-app 2>$null
Write-Host "Done" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Rebuilding Docker image with migration fix..." -ForegroundColor Yellow
docker compose -f "$dockerDir\docker-compose.yml" build --no-cache
Write-Host "Done" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Starting production container..." -ForegroundColor Yellow
docker compose -f "$dockerDir\docker-compose.yml" up -d
Write-Host "Done" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Waiting 15 seconds for container startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host "Done" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Checking container status..." -ForegroundColor Yellow
docker ps -a --filter "name=sms-app"
Write-Host ""

Write-Host "Step 7: Checking logs for errors..." -ForegroundColor Yellow
$logs = docker logs sms-app 2>&1 | Select-String "error|ERROR|fail|FAIL" -First 5
if ($logs) {
    Write-Host "⚠️  Errors found:" -ForegroundColor Red
    $logs
} else {
    Write-Host "✅ No errors found" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 8: Testing health endpoint..." -ForegroundColor Yellow
$healthCheck = curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
Write-Host "HTTP Status: $healthCheck" -ForegroundColor Cyan
Write-Host ""

if ($healthCheck -eq "200" -or $healthCheck -eq "301" -or $healthCheck -eq "404") {
    Write-Host "✅ Application is responding!" -ForegroundColor Green
    Write-Host "Access at: http://localhost:8080" -ForegroundColor Cyan
} else {
    Write-Host "❌ Application not responding (status: $healthCheck)" -ForegroundColor Red
    Write-Host "Full logs:" -ForegroundColor Yellow
    docker logs sms-app 2>&1 | Select-Object -Last 30
}

Write-Host ""
Write-Host "=== Rebuild Complete ===" -ForegroundColor Cyan
