<#
.SYNOPSIS
  Docker setup and start for Student Management System

.DESCRIPTION
  Release 1.4.0 - Fullstack Docker deployment (default) with optional multi-container mode
  - Checks Docker availability (fails if not installed)
  - Creates .env files from templates
  - Builds Docker images (fullstack by default)
  - Starts containers on port 8080
  - Waits for services to be ready
  - Logs to setup.log

.PARAMETER Force
  Force rebuild Docker images (--no-cache)

.PARAMETER SkipStart
  Build images but don't start containers

.PARAMETER DevMode
  Use multi-container mode (backend + frontend separate) instead of fullstack

.PARAMETER Verbose
  Show detailed output

.EXAMPLE
  .\SMART_SETUP.ps1              # Build and start fullstack (recommended)
  .\SMART_SETUP.ps1 -Force       # Rebuild fullstack from scratch
  .\SMART_SETUP.ps1 -DevMode     # Use multi-container for development
  .\SMART_SETUP.ps1 -SkipStart   # Build only

.NOTES
  For end users: Use .\RUN.ps1 instead (simpler one-click deployment)
  For developers: Use -DevMode for hot reload and separate logs
#>

param(
  [switch]$Force,
  [switch]$SkipStart,
  [switch]$DevMode,
  [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logPath = Join-Path $root 'setup.log'

# ===== LOGGING =====
function Write-Log {
  param([string]$Message, [string]$Level = 'INFO')
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$ts] [$Level] $Message"
  Write-Host $line
  Add-Content -LiteralPath $logPath -Value $line
}

# ===== DOCKER CHECK =====
function Test-DockerAvailable {
  try {
    $null = Get-Command 'docker' -ErrorAction Stop
    $result = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Log "Docker found: $result"
      return $true
    }
  } catch {}
  return $false
}

# ===== ENV FILES =====
function Set-EnvFromTemplate {
  param([string]$Dir)
  $envFile = Join-Path $Dir '.env'
  $example = Join-Path $Dir '.env.example'

  if (-not (Test-Path $envFile) -and (Test-Path $example)) {
    Copy-Item -LiteralPath $example -Destination $envFile -Force
    Write-Log "Created $envFile from template"
  } elseif (Test-Path $envFile) {
    Write-Log "$envFile already exists"
  }
}

# ===== VERSION SYNC =====
function Set-ComposeEnvVersion {
  try {
    $versionFile = Join-Path $root 'VERSION'
    $composeEnv = Join-Path $root '.env'
    $version = 'latest'

    if (Test-Path $versionFile) {
      $v = Get-Content -LiteralPath $versionFile -Raw -ErrorAction Stop
      if ($v) { $version = $v.Trim() }
    }

    if (Test-Path $composeEnv) {
      $lines = Get-Content -LiteralPath $composeEnv
      $found = $false
      $newLines = @()

      foreach ($line in $lines) {
        if ($line -match '^VERSION=') {
          $newLines += "VERSION=$version"
          $found = $true
        } else {
          $newLines += $line
        }
      }

      if (-not $found) { $newLines += "VERSION=$version" }
      Set-Content -LiteralPath $composeEnv -Value $newLines -Encoding UTF8
    } else {
      Set-Content -LiteralPath $composeEnv -Value @("VERSION=$version") -Encoding UTF8
    }

    Write-Log "Set VERSION=$version in .env"
  } catch {
    Write-Log "Failed to set VERSION: $($_.Exception.Message)" 'WARN'
  }
}

# ===== WAIT FOR SERVICE =====
function Wait-ServiceReady {
  param([string[]]$Urls, [int]$TimeoutSec = 180)

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  Write-Log "Waiting for service to be ready (timeout: ${TimeoutSec}s)..."

  while ((Get-Date) -lt $deadline) {
    foreach ($url in $Urls) {
      try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
          Write-Log "Service ready at: $url"
          return $true
        }
      } catch {
        # Service not ready yet, continue waiting
      }
    }
    Start-Sleep -Seconds 2
  }

  Write-Log "Service did not become ready within ${TimeoutSec}s" 'WARN'
  return $false
}

# ===== MAIN =====
"==== SMART_SETUP started $(Get-Date) ====" | Out-File -FilePath $logPath -Encoding utf8 -Force
Write-Log "Student Management System - Docker Setup v1.4.0"

# Determine deployment mode
if ($DevMode) {
  Write-Log "Using MULTI-CONTAINER mode (backend + frontend separate)" 'INFO'
  $deploymentMode = "multi-container"
} else {
  Write-Log "Using FULLSTACK mode (single container - recommended for end users)" 'INFO'
  $deploymentMode = "fullstack"
}

# 1. Check Docker
Write-Log "Checking Docker availability..."
if (-not (Test-DockerAvailable)) {
  Write-Log "ERROR: Docker is not available" 'ERROR'
  Write-Host ""
  Write-Host "❌ Docker is required for this release (v1.4.0)" -ForegroundColor Red
  Write-Host "📥 Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "💡 TIP: For simpler deployment, use .\RUN.ps1 instead" -ForegroundColor Cyan
  Write-Host ""
  exit 1
}

# 2. Create .env files
Write-Log "Setting up environment files..."
Set-EnvFromTemplate -Dir (Join-Path $root 'backend')
Set-EnvFromTemplate -Dir (Join-Path $root 'frontend')
Set-ComposeEnvVersion

# 3. Build Docker images
Write-Log "Building Docker images ($deploymentMode mode)..."
Push-Location $root
try {
  if ($deploymentMode -eq "fullstack") {
    # Build fullstack image
    $buildArgs = @('build', '-t', "sms-fullstack:$((Get-Content (Join-Path $root 'VERSION')).Trim())", '-f', 'docker/Dockerfile.fullstack', '.')
    if ($Force) {
      Write-Log "Force rebuild requested (--no-cache)" 'WARN'
      $buildArgs += '--no-cache'
    }

    $buildProcess = Start-Process -FilePath 'docker' -ArgumentList $buildArgs -NoNewWindow -Wait -PassThru
    if ($buildProcess.ExitCode -ne 0) {
      throw "Docker build failed with exit code $($buildProcess.ExitCode)"
    }
    Write-Log "Fullstack Docker image built successfully"
  } else {
    # Build multi-container images using docker compose
    $buildArgs = @('compose', 'build')
    if ($Force) {
      Write-Log "Force rebuild requested (--no-cache)" 'WARN'
      $buildArgs += '--no-cache'
    }
    if ($Verbose) {
      $buildArgs += '--progress=plain'
    }

    $buildProcess = Start-Process -FilePath 'docker' -ArgumentList $buildArgs -NoNewWindow -Wait -PassThru
    if ($buildProcess.ExitCode -ne 0) {
      throw "Docker build failed with exit code $($buildProcess.ExitCode)"
    }
    Write-Log "Multi-container Docker images built successfully"
  }
} finally {
  Pop-Location
}

# 4. Start containers (unless SkipStart)
if ($SkipStart) {
  Write-Log "SkipStart requested - images built but containers not started"
  Write-Host ""
  Write-Host "✅ Docker images built successfully" -ForegroundColor Green
  if ($deploymentMode -eq "fullstack") {
    Write-Host "To start: .\RUN.ps1" -ForegroundColor Cyan
  } else {
    Write-Host "To start containers, run: .\SMS.ps1 -Quick" -ForegroundColor Cyan
  }
  Write-Host ""
  exit 0
}

Write-Log "Starting containers ($deploymentMode mode)..."
Push-Location $root
try {
  if ($deploymentMode -eq "fullstack") {
    # Start fullstack container using RUN.ps1 logic
    $version = (Get-Content (Join-Path $root 'VERSION')).Trim()
    $containerName = "sms-app"
    $imageName = "sms-fullstack:$version"
    $volumeName = "sms_data"

    # Remove existing container if present
    docker rm -f $containerName 2>$null | Out-Null

    # Start new container
    docker run -d `
      --name $containerName `
      -p 8080:8000 `
      -v "${volumeName}:/app/data" `
      -v "${root}/templates:/app/templates:ro" `
      --restart unless-stopped `
      $imageName 2>&1 | ForEach-Object { Write-Log $_ }

    if ($LASTEXITCODE -ne 0) {
      throw "Failed to start fullstack container"
    }
    Write-Log "Fullstack container started successfully"
  } else {
    # Start multi-container using docker compose
    docker compose up -d 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to start containers"
    }
    Write-Log "Multi-container stack started successfully"
  }
} finally {
  Pop-Location
}

# 5. Wait for service and show URLs
$ready = Wait-ServiceReady -Urls @('http://localhost:8080/health', 'http://localhost:8080')

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Mode: " -NoNewline -ForegroundColor Cyan
if ($deploymentMode -eq "fullstack") {
  Write-Host "Fullstack (single container)" -ForegroundColor Green
} else {
  Write-Host "Multi-container (backend + frontend)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Main App:      http://localhost:8080" -ForegroundColor Green
Write-Host "  API Docs:      http://localhost:8080/docs" -ForegroundColor Green
Write-Host "  Health Check:  http://localhost:8080/health" -ForegroundColor Green
Write-Host ""
Write-Host "Management:" -ForegroundColor Cyan
if ($deploymentMode -eq "fullstack") {
  Write-Host "  Start/Stop:    .\RUN.ps1" -ForegroundColor Green
  Write-Host "  Update:        .\RUN.ps1 -Update" -ForegroundColor Green
  Write-Host "  Status:        .\RUN.ps1 -Status" -ForegroundColor Green
} else {
  Write-Host "  Start/Stop:    .\SMS.ps1" -ForegroundColor Green
  Write-Host "  Status:        .\SMS.ps1 -Status" -ForegroundColor Green
  Write-Host "  Logs:          .\SMS.ps1 -Logs" -ForegroundColor Green
}
Write-Host ""

if (-not $ready) {
  Write-Host "⚠️  Service is starting but not yet ready" -ForegroundColor Yellow
  if ($deploymentMode -eq "fullstack") {
    Write-Host "   Check status: .\RUN.ps1 -Status" -ForegroundColor Yellow
    Write-Host "   View logs:    .\RUN.ps1 -Logs" -ForegroundColor Yellow
  } else {
    Write-Host "   Check status: .\SMS.ps1 -Status" -ForegroundColor Yellow
    Write-Host "   View logs:    .\SMS.ps1 -Logs" -ForegroundColor Yellow
  }
  Write-Host ""
}

Write-Log "Setup completed successfully ($deploymentMode mode)"
