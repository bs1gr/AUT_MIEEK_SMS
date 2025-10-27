param(
    [string]$BaseVolume = "sms_data",
    [switch]$NoMigrate
)

# Navigate to repo root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""; Write-Host "=======================================" -ForegroundColor Cyan
Write-Host " Docker Data Volume Update" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running or not installed. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Determine new volume name
$today = Get-Date -Format "yyyyMMdd"
$newVolume = "$BaseVolume" + "_v$today"

# Ensure unique name
$existing = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $newVolume }
if ($existing) {
    $i = 2
    do {
        $newVolume = "$BaseVolume" + "_v$today" + "_" + $i
        $exists = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $newVolume }
        $i++
    } while ($exists)
}

Write-Host "Creating volume: $newVolume" -ForegroundColor Yellow
$createOut = docker volume create $newVolume 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create volume: $createOut" -ForegroundColor Red
    exit 1
}

# Migrate data (optional)
$baseExists = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $BaseVolume }
if (-not $NoMigrate -and $baseExists) {
    Write-Host "Migrating data from $BaseVolume to $newVolume ..." -ForegroundColor Yellow
    docker run --rm -v "${BaseVolume}:/from" -v "${newVolume}:/to" alpine sh -c "cd /from && cp -a . /to || true"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Migration reported a non-zero exit. Check data manually." -ForegroundColor Yellow
    } else {
        Write-Host "Migration complete." -ForegroundColor Green
    }
} else {
    Write-Host "Skipping data migration." -ForegroundColor Yellow
}

# Write docker-compose.override.yml
$overridePath = Join-Path $projectRoot "docker-compose.override.yml"
$override = @(
    "services:",
    "  backend:",
    "    volumes:",
    "      - ${newVolume}:/data",
    "volumes:",
    "  ${newVolume}:",
    "    driver: local"
) -join "`n"

$override | Out-File -FilePath $overridePath -Encoding utf8 -Force
Write-Host "Wrote override: $overridePath" -ForegroundColor Green

Write-Host ""; Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  docker compose down" -ForegroundColor Gray
Write-Host "  docker compose up -d" -ForegroundColor Gray
Write-Host ""; Write-Host "Done." -ForegroundColor Green
