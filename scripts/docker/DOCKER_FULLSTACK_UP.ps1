# Build and run single-container fullstack image
param(
    [switch]$Rebuild,
    [switch]$NoCache,
    [int]$Port = 8080
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
        Write-Err "Docker Desktop not found. Please install Docker Desktop and try again: https://www.docker.com/products/docker-desktop/"
        return $false
    }
    try {
        Start-Process -FilePath $dd | Out-Null
    } catch {
        Write-Err "Failed to start Docker Desktop at '$dd'. Start it manually and re-run this script."
        return $false
    }

    # Wait for engine to become available (max ~3 minutes)
    $retries = 90
    for ($i=0; $i -lt $retries; $i++) {
        if (Test-DockerAvailable) { break }
        Start-Sleep -Seconds 2
        if ($i % 10 -eq 0) { Write-Info "Waiting for Docker engine... ($i/$retries)" }
    }
    if (-not (Test-DockerAvailable)) {
        Write-Err "Docker engine did not become ready. Open Docker Desktop, ensure it is running (Linux containers), then retry."
        return $false
    }
    return $true
}

function Ensure-LinuxEngine {
    try {
        $osType = docker info --format '{{.OSType}}' 2>$null
    } catch { $osType = '' }
    if ($osType -and $osType.Trim().ToLower() -eq 'linux') { return $true }
    Write-Warn "Docker is currently using Windows containers. Please switch to Linux containers in Docker Desktop (System Tray → Docker → Switch to Linux containers) and re-run."
    try {
        $cli = Join-Path $Env:ProgramFiles 'Docker\Docker\DockerCli.exe'
        if (Test-Path $cli) {
            Write-Info "Attempting to switch to Linux engine..."
            Start-Process -FilePath $cli -ArgumentList '-SwitchLinuxEngine' -Wait -NoNewWindow -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            $osType = docker info --format '{{.OSType}}' 2>$null
            if ($osType.Trim().ToLower() -eq 'linux') { return $true }
        }
    } catch { }
    return $false
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    if (-not (Ensure-DockerRunning)) { exit 1 }
    if (-not (Ensure-LinuxEngine)) { exit 1 }

    $img = "sms-fullstack"
    $ctn = "sms-fullstack"

    if ($Rebuild) {
        Write-Info "Building fullstack image..."
        $args = @("build","-f","docker/Dockerfile.fullstack","-t",$img)
        if ($NoCache) { $args += "--no-cache" }
        $args += "."
        $b = Start-Process -FilePath "docker" -ArgumentList $args -NoNewWindow -PassThru
        $b.WaitForExit()
        if ($b.ExitCode -ne 0) { Write-Err "Build failed ($($b.ExitCode))"; exit $b.ExitCode }
        Write-Ok "Build complete."
    }

    # Stop existing container with same name (ignore errors)
    try { docker rm -f $ctn 1>$null 2>$null } catch { }

    Write-Ok "Starting fullstack container on http://localhost:$($Port) ..."
    Write-Info "Port mapping: $($Port):8000"
    $runArgs = @('run','-d','--name',$ctn,
    '-p',"$($Port):8000",
        '-e','DATABASE_URL=sqlite:////data/student_management.db',
        '-v','sms_data:/data',
        $img)
    Write-Info ("docker " + ($runArgs -join ' '))
    & docker @runArgs
    if ($LASTEXITCODE -ne 0) { Write-Err "Run failed ($LASTEXITCODE)"; exit $LASTEXITCODE }

    Write-Warn "Opening app..."
    Start-Process "http://localhost:$Port" | Out-Null
} finally {
    Pop-Location
}
