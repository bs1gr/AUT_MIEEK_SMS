# Stop and remove the single-container fullstack app
param(
    [switch]$RemoveImage
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

$ctn = "sms-fullstack"
$img = "sms-fullstack"

if (-not (Test-DockerAvailable)) {
    Write-Warn "Docker is not available. Nothing to stop."
    exit 0
}

Write-Info "Stopping and removing container $ctn ..."
try { docker rm -f $ctn 1>$null 2>$null } catch { }

if ($RemoveImage) {
    Write-Warn "Removing image $img ..."
    try { docker rmi -f $img 1>$null 2>$null } catch { }
}

Write-Ok "Done."
