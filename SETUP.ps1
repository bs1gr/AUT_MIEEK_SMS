# ============================================================================
#   Student Management System - First Time Setup
#   Builds the fullstack Docker image and prepares the environment
# ============================================================================

param(
    [switch]$SkipBuild,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)   { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host $msg -ForegroundColor Red }

function Show-Help {
    Write-Host ""
    Write-Host "SETUP - Student Management System" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "First-time setup: builds the fullstack Docker image." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\SETUP.ps1 [options]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -SkipBuild    Skip image build (check environment only)"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "What this does:" -ForegroundColor Cyan
    Write-Host "  1. Checks Docker Desktop is installed and running"
    Write-Host "  2. Ensures Linux containers mode is enabled"
    Write-Host "  3. Builds the fullstack Docker image (sms-fullstack)"
    Write-Host "  4. Creates the database volume"
    Write-Host ""
    Write-Host "After setup, run the app with:" -ForegroundColor Cyan
    Write-Host "  .\QUICKSTART.bat"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

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
        (Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path ${Env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $Env:LocalAppData 'Docker\Docker Desktop.exe')
    )
    foreach ($p in $candidates) { 
        if (Test-Path $p) { return $p } 
    }
    return $null
}

function Ensure-DockerRunning {
    if (Test-DockerAvailable) { 
        Write-Ok "✓ Docker Desktop is running"
        return $true 
    }

    Write-Warn "Docker Desktop is not running. Attempting to start..."
    $dd = Get-DockerDesktopPath
    if (-not $dd) {
        Write-Err "✗ Docker Desktop not found"
        Write-Host ""
        Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
        Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
        Write-Host ""
        return $false
    }
    
    try {
        Start-Process -FilePath $dd | Out-Null
        Write-Info "Starting Docker Desktop..."
    } catch {
        Write-Err "Failed to start Docker Desktop at '$dd'"
        Write-Warn "Please start Docker Desktop manually and re-run this script."
        return $false
    }

    # Wait for engine (max ~3 minutes)
    $retries = 90
    for ($i = 0; $i -lt $retries; $i++) {
        if (Test-DockerAvailable) { 
            Write-Ok "✓ Docker Desktop started successfully"
            return $true 
        }
        Start-Sleep -Seconds 2
        if ($i % 10 -eq 0 -and $i -gt 0) { 
            Write-Info "  Waiting for Docker engine... ($i/$retries)" 
        }
    }
    
    Write-Err "✗ Docker engine did not become ready"
    Write-Warn "Open Docker Desktop, ensure it's fully started, then retry."
    return $false
}

function Ensure-LinuxEngine {
    try {
        $osType = docker info --format '{{.OSType}}' 2>$null
    } catch { 
        $osType = '' 
    }
    
    if ($osType -and $osType.Trim().ToLower() -eq 'linux') { 
        Write-Ok "✓ Linux containers mode enabled"
        return $true 
    }
    
    Write-Warn "Docker is using Windows containers. Switching to Linux containers..."
    try {
        $cli = Join-Path $Env:ProgramFiles 'Docker\Docker\DockerCli.exe'
        if (Test-Path $cli) {
            Start-Process -FilePath $cli -ArgumentList '-SwitchLinuxEngine' -Wait -NoNewWindow -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            $osType = docker info --format '{{.OSType}}' 2>$null
            if ($osType -and $osType.Trim().ToLower() -eq 'linux') { 
                Write-Ok "✓ Switched to Linux containers"
                return $true 
            }
        }
    } catch { }
    
    Write-Err "✗ Could not switch to Linux containers automatically"
    Write-Host ""
    Write-Host "Please manually switch to Linux containers:" -ForegroundColor Yellow
    Write-Host "  1. Right-click Docker Desktop icon in system tray" -ForegroundColor Cyan
    Write-Host "  2. Select 'Switch to Linux containers...'" -ForegroundColor Cyan
    Write-Host "  3. Re-run this setup script" -ForegroundColor Cyan
    Write-Host ""
    return $false
}

function Build-FullstackImage {
    Write-Host ""
    Write-Info "Building fullstack Docker image..."
    Write-Host ""
    
    try {
        $buildProcess = Start-Process -FilePath "docker" `
            -ArgumentList @("build", "-f", "docker/Dockerfile.fullstack", "-t", "sms-fullstack", ".") `
            -NoNewWindow -PassThru -Wait
        
        if ($buildProcess.ExitCode -ne 0) {
            Write-Err "✗ Image build failed (exit code: $($buildProcess.ExitCode))"
            return $false
        }
        
        Write-Ok "✓ Fullstack image built successfully"
        return $true
    } catch {
        Write-Err "✗ Build failed: $_"
        return $false
    }
}

function Create-DataVolume {
    Write-Info "Ensuring data volume exists..."
    try {
        $volumeName = "sms_data"
        $existing = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volumeName }
        
        if ($existing) {
            Write-Ok "✓ Data volume '$volumeName' already exists"
        } else {
            docker volume create $volumeName | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "✓ Created data volume '$volumeName'"
            } else {
                Write-Warn "Could not create volume (may not be critical)"
            }
        }
        return $true
    } catch {
        Write-Warn "Could not verify/create volume: $_"
        return $true  # Non-critical
    }
}

# ============================================================================
# Main Setup Flow
# ============================================================================

Push-Location $PSScriptRoot
try {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - First Time Setup" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    # Step 1: Check Docker
    Write-Info "Step 1/4: Checking Docker Desktop..."
    if (-not (Ensure-DockerRunning)) {
        exit 1
    }

    # Step 2: Check Linux containers
    Write-Host ""
    Write-Info "Step 2/4: Verifying Linux containers mode..."
    if (-not (Ensure-LinuxEngine)) {
        exit 1
    }

    # Step 3: Build image
    if (-not $SkipBuild) {
        Write-Host ""
        Write-Info "Step 3/4: Building fullstack image (this may take a few minutes)..."
        if (-not (Build-FullstackImage)) {
            Write-Host ""
            Write-Err "Setup failed. Please check the error messages above."
            exit 1
        }
    } else {
        Write-Host ""
        Write-Info "Step 3/4: Skipping image build (-SkipBuild specified)"
    }

    # Step 4: Create volume
    Write-Host ""
    Write-Info "Step 4/4: Creating data volume..."
    Create-DataVolume | Out-Null

    # Success
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  ✓ Setup Complete!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start the app:    .\QUICKSTART.bat" -ForegroundColor White
    Write-Host "  2. Access at:        http://localhost:8080" -ForegroundColor White
    Write-Host "  3. Stop the app:     .\STOP.bat" -ForegroundColor White
    Write-Host ""
    Write-Host "For troubleshooting and developer tools:" -ForegroundColor Cyan
    Write-Host "  .\DEVTOOLS.bat" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Err "Setup error: $_"
    exit 1
} finally {
    Pop-Location
}
