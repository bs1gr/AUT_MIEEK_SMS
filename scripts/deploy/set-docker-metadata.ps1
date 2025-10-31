# Set Docker build metadata for versioned builds
# This script sets environment variables used by docker-compose

$ErrorActionPreference = "Stop"

# Read version from VERSION file
$VERSION = "latest"
if (Test-Path "VERSION") {
    $VERSION = (Get-Content "VERSION" -Raw).Trim()
}

# Get build date in ISO format
$BUILD_DATE = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

# Get git commit hash
$VCS_REF = "unknown"
try {
    $VCS_REF = (git rev-parse --short HEAD 2>$null).Trim()
    if (-not $VCS_REF) {
        $VCS_REF = "unknown"
    }
} catch {
    $VCS_REF = "unknown"
}

# Set environment variables
$env:VERSION = $VERSION
$env:BUILD_DATE = $BUILD_DATE
$env:VCS_REF = $VCS_REF

Write-Host "Docker Build Metadata:" -ForegroundColor Green
Write-Host "  VERSION:    $VERSION" -ForegroundColor Cyan
Write-Host "  BUILD_DATE: $BUILD_DATE" -ForegroundColor Cyan
Write-Host "  VCS_REF:    $VCS_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment variables set. You can now run:" -ForegroundColor Yellow
Write-Host "  docker compose build" -ForegroundColor White
Write-Host "  docker compose up -d" -ForegroundColor White
