# Build and run Docker Compose for SMS
param(
    [switch]$Rebuild
)

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

function Get-DockerDesktopPath {
    $candidates = @(
        Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path ${Env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $Env:LocalAppData 'Docker\Docker Desktop.exe')
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
}

function Ensure-DockerRunning {
    if (Test-DockerAvailable) { return $true }
    Write-Warn "Docker Desktop doesn't seem to be running. Attempting to start it..."
    $dd = Get-DockerDesktopPath
    if (-not $dd) {
        Write-Err "Docker Desktop not found. Install it: https://www.docker.com/products/docker-desktop/"
        return $false
    }
    try { Start-Process -FilePath $dd | Out-Null } catch { Write-Err "Failed to start Docker Desktop."; return $false }
    $retries = 90
    for ($i=0; $i -lt $retries; $i++) { if (Test-DockerAvailable) { break }; Start-Sleep -Seconds 2; if ($i % 10 -eq 0) { Write-Info "Waiting for Docker engine... ($i/$retries)" } }
    return (Test-DockerAvailable)
}

function Ensure-LinuxEngine {
    try { $osType = docker info --format '{{.OSType}}' 2>$null } catch { $osType = '' }
    if ($osType -and $osType.Trim().ToLower() -eq 'linux') { return $true }
    Write-Warn "Docker is using Windows containers. Switch to Linux containers in Docker Desktop."
    try {
        $cli = Join-Path $Env:ProgramFiles 'Docker\Docker\DockerCli.exe'
        if (Test-Path $cli) { Start-Process -FilePath $cli -ArgumentList '-SwitchLinuxEngine' -Wait -NoNewWindow -ErrorAction SilentlyContinue }
    } catch { }
    try { $osType = docker info --format '{{.OSType}}' 2>$null } catch { $osType = '' }
    return ($osType.Trim().ToLower() -eq 'linux')
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    if (-not (Ensure-DockerRunning)) { exit 1 }
    if (-not (Ensure-LinuxEngine))   { Write-Err "Linux engine not active."; exit 1 }

    if ($Rebuild) {
        Write-Info "Rebuilding images..."
        & docker compose build
        if ($LASTEXITCODE -ne 0) { Write-Err "docker compose build failed ($LASTEXITCODE)"; exit $LASTEXITCODE }
    }

    Write-Ok "Starting containers..."
    & docker compose up -d
    if ($LASTEXITCODE -ne 0) { Write-Err "docker compose up failed ($LASTEXITCODE)"; exit $LASTEXITCODE }

    Write-Warn "Opening app at http://localhost:8080"
    Start-Process "http://localhost:8080" | Out-Null
} finally {
    Pop-Location
}
