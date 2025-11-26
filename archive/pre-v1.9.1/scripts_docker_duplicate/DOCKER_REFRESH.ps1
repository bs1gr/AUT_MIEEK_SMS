param(
    [switch]$NoCache
)

Write-Host "Refreshing Docker stack with latest code..." -ForegroundColor Cyan

$composeArgs = "up -d --build"
if ($NoCache) {
    $composeArgs = "build --no-cache";
    Write-Host "Running: docker compose $composeArgs" -ForegroundColor Yellow
    docker compose build --no-cache
    Write-Host "Starting stack: docker compose up -d" -ForegroundColor Yellow
    docker compose up -d
} else {
    Write-Host "Running: docker compose $composeArgs" -ForegroundColor Yellow
    docker compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker refresh failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Docker stack is up-to-date and running." -ForegroundColor Green
