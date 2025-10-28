param(
    [ValidateSet('compose','fullstack')]
    [string]$Mode = 'compose',
    [switch]$NoCache,
    [switch]$Down,
    [switch]$Run,
    [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'

# Move to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "[DOCKER] Mode=$Mode  NoCache=$NoCache  Down=$Down  Run=$Run  Port=$Port" -ForegroundColor Cyan

if ($Down) {
    if ($Mode -eq 'compose') {
        Write-Host "docker compose down" -ForegroundColor Yellow
        docker compose down
    } else {
        $existing = (docker ps -a --filter "name=sms-fullstack" --format "{{.ID}}")
        if ($existing) {
            Write-Host "Stopping fullstack container: sms-fullstack" -ForegroundColor Yellow
            docker rm -f sms-fullstack | Out-Null
        } else {
            Write-Host "No existing fullstack container found." -ForegroundColor DarkGray
        }
    }
    Write-Host "Done." -ForegroundColor Green
    exit 0
}

if ($Mode -eq 'compose') {
    # Compose flow (two containers)
    $refresh = Join-Path $PSScriptRoot 'DOCKER_REFRESH.ps1'
    $args = @()
    if ($NoCache) { $args += '-NoCache' }
    Write-Host ("Running: $refresh " + ($args -join ' ')) -ForegroundColor Yellow
    & $refresh @args
    exit $LASTEXITCODE
} else {
    # Fullstack flow (single container)
    $refresh = Join-Path $PSScriptRoot 'DOCKER_FULLSTACK_REFRESH.ps1'
    if ($NoCache) {
        Write-Host "Running: $refresh -NoCache -Run -Port $Port" -ForegroundColor Yellow
        & $refresh -NoCache -Run -Port $Port
    } else {
        Write-Host "Running: $refresh -Run -Port $Port" -ForegroundColor Yellow
        & $refresh -Run -Port $Port
    }
    exit $LASTEXITCODE
}
