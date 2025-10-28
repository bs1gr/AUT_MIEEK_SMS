# Stop and remove Docker Compose for SMS

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)   { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host $msg -ForegroundColor Red }

function Test-DockerAvailable {
    try {
        $null = docker version --format '{{.Server.Version}}' 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    if (-not (Test-DockerAvailable)) {
        Write-Warn "Docker is not available. Nothing to stop."
        exit 0
    }

    Write-Info "Stopping containers (docker compose down)..."
    & docker compose down
    if ($LASTEXITCODE -ne 0) { Write-Err "docker compose down failed ($LASTEXITCODE)"; exit $LASTEXITCODE }

    Write-Ok "Done."
} finally {
    Pop-Location
}
