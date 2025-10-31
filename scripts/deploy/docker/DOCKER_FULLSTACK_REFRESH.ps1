param(
    [switch]$NoCache,
    [switch]$Run,
    [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'

## Ensure we run from project root (parent of this script folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Building fullstack Docker image (sms-fullstack) from docker/Dockerfile.fullstack..." -ForegroundColor Cyan

$buildArgs = @('build','-f','docker/Dockerfile.fullstack','-t','sms-fullstack','.')
if ($NoCache) { $buildArgs = @('build','--no-cache','-f','docker/Dockerfile.fullstack','-t','sms-fullstack','.') }

Write-Host ("docker " + ($buildArgs -join ' ')) -ForegroundColor Yellow

docker @buildArgs
if ($LASTEXITCODE -ne 0) { throw "Docker build failed with exit code $LASTEXITCODE" }

if ($Run) {
    Write-Host "Running container sms-fullstack on port $Port -> 8000" -ForegroundColor Cyan

    # Stop and remove existing container if present
    $existing = (docker ps -a --filter "name=sms-fullstack" --format "{{.ID}}")
    if ($existing) {
        Write-Host "Stopping existing container: $existing" -ForegroundColor Yellow
        docker rm -f sms-fullstack | Out-Null
    }

    # Run new container
    $portMap = "{0}:8000" -f $Port
    $runArgs = @('run','-d','--name','sms-fullstack','-p',$portMap,'sms-fullstack')
    Write-Host ("docker " + ($runArgs -join ' ')) -ForegroundColor Yellow
    docker @runArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker run failed with exit code $LASTEXITCODE" }

    Write-Host "Container sms-fullstack is running at http://localhost:$Port" -ForegroundColor Green
    Write-Host "Backend health: http://localhost:$Port/health" -ForegroundColor Green
}

Write-Host "Fullstack image refresh complete." -ForegroundColor Green
