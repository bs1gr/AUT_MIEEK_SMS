<#
.SYNOPSIS
  Environment setup and start for Student Management System

.DESCRIPTION
  Release 1.4.1 - Supports Docker workflows (fullstack container by default, multi-container via -DevMode)
  and native developer workflow via -PreferNative.
  - Checks Docker availability (fails if not installed unless native mode requested)
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

.PARAMETER PreferNative
  Run the native developer stack (FastAPI + Vite) without Docker

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
  [switch]$PreferNative,
  [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logPath = Join-Path $root 'setup.log'
$backendPidFile = Join-Path $root '.backend.pid'
$frontendPidFile = Join-Path $root '.frontend.pid'

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

function Test-CommandAvailable {
  param([string]$Name)
  try {
    $null = Get-Command $Name -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Install-NativeBackendDependencies {
  param([switch]$ForceInstall)
  $backendDir = Join-Path $root 'backend'
  if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found at $backendDir"
  }

  Push-Location $backendDir
  try {
    $venvDir = Join-Path $backendDir '.venv'
    $venvPython = if ($IsWindows) {
      Join-Path $venvDir 'Scripts\python.exe'
    } else {
      Join-Path $venvDir 'bin/python'
    }

    if (-not (Test-Path $venvPython)) {
      Write-Log 'Creating backend virtual environment (.venv)...'
      python -m venv '.venv' 2>&1 | ForEach-Object { Write-Log $_ }
      if ($LASTEXITCODE -ne 0) {
        throw 'Failed to create backend virtual environment (.venv)'
      }
    }

    $pythonCmd = if (Test-Path $venvPython) { $venvPython } else { 'python' }
    Write-Log "Using backend Python interpreter: $pythonCmd"

    if ($ForceInstall) {
      Write-Log 'Force reinstall of backend dependencies requested' 'WARN'
    }

    Write-Log 'Installing backend dependencies (pip)...'
    & $pythonCmd -m pip install --disable-pip-version-check --upgrade pip 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to upgrade pip for backend dependencies'
    }

    $installArgs = @('-m','pip','install','--disable-pip-version-check')
    if ($ForceInstall) { $installArgs += '--force-reinstall' }
    $installArgs += '-r'
    $installArgs += 'requirements.txt'
    & $pythonCmd @installArgs 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to install backend requirements'
    }
  } finally {
    Pop-Location
  }
}

function Install-NativeFrontendDependencies {
  param([switch]$ForceInstall)
  $frontendDir = Join-Path $root 'frontend'
  if (-not (Test-Path $frontendDir)) {
    Write-Log "Frontend directory not found at $frontendDir" 'WARN'
    return
  }

  Push-Location $frontendDir
  try {
    Write-Log 'Installing frontend dependencies (npm)...'
    if ($ForceInstall -and (Test-Path 'node_modules')) {
      Write-Log 'Removing existing node_modules for clean install' 'WARN'
      Remove-Item -LiteralPath 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
    }

    $npmArgs = if (Test-Path 'package-lock.json') { @('ci','--no-audit') } else { @('install','--no-audit') }
    if ($ForceInstall) { $npmArgs += '--force' }
    if (-not $Verbose) { $npmArgs += '--silent' }
    npm @npmArgs 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to install frontend dependencies'
    }
  } finally {
    Pop-Location
  }
}

function Invoke-NativeMigrations {
  $backendDir = Join-Path $root 'backend'
  if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found at $backendDir"
  }

  Push-Location $backendDir
  try {
    Write-Log 'Running Alembic migrations...'
    python -m alembic upgrade head 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      throw 'Alembic migrations failed to apply'
    }
  } finally {
    Pop-Location
  }
}

function Start-NativeBackendProcess {
  param([switch]$EnableVerboseLogging)
  $uvicornCommand = 'python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 --reload-dir backend'
  if ($EnableVerboseLogging) {
    $uvicornCommand += ' --log-level debug'
  }
  $commandSteps = @(
    "Set-Location -LiteralPath '$root'",
    "\$env:PYTHONPATH = '$root'",
    $uvicornCommand
  )
  $command = $commandSteps -join '; '
  Write-Log 'Starting backend development server (uvicorn)...'
  $proc = Start-Process -FilePath 'pwsh' -ArgumentList '-NoLogo','-NoExit','-Command',$command -PassThru
  if ($null -ne $proc) {
    try {
      Set-Content -LiteralPath $backendPidFile -Value $proc.Id -Encoding ascii
      Write-Log "Recorded backend native PID $($proc.Id)"
    } catch {
      Write-Log "Failed to record backend PID: $($_.Exception.Message)" 'WARN'
    }
  }
  return $proc
}

function Start-NativeFrontendProcess {
  $frontendDir = Join-Path $root 'frontend'
  $command = "Set-Location -LiteralPath '$frontendDir'; npm run dev"
  Write-Log 'Starting frontend development server (Vite)...'
  $proc = Start-Process -FilePath 'pwsh' -ArgumentList '-NoLogo','-NoExit','-Command',$command -PassThru
  if ($null -ne $proc) {
    try {
      Set-Content -LiteralPath $frontendPidFile -Value $proc.Id -Encoding ascii
      Write-Log "Recorded frontend native PID $($proc.Id)"
    } catch {
      Write-Log "Failed to record frontend PID: $($_.Exception.Message)" 'WARN'
    }
  }
  return $proc
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

function Invoke-NativeSetup {
  param(
    [switch]$ForceInstall,
    [switch]$SkipStart,
    [switch]$EnableVerboseLogging
  )

  try {
    Write-Log 'PreferNative flag detected - switching to native workflow'

    if (-not (Test-CommandAvailable 'python')) {
      throw 'Python is required for native mode but was not found in PATH.'
    }

    $hasNode = Test-CommandAvailable 'node'
    if ($hasNode) {
      Write-Log 'Node.js detected; frontend dev server will be started after backend is ready'
    } else {
      Write-Log 'Node.js not found; frontend dev server will be skipped' 'WARN'
    }

    # Ensure environment files exist for both backend and frontend
    Set-EnvFromTemplate -Dir (Join-Path $root 'backend')
    Set-EnvFromTemplate -Dir (Join-Path $root 'frontend')

    Install-NativeBackendDependencies -ForceInstall:$ForceInstall
    if ($hasNode) {
      Install-NativeFrontendDependencies -ForceInstall:$ForceInstall
    }

    Invoke-NativeMigrations

    if ($SkipStart) {
      Write-Log 'SkipStart requested - leaving services stopped after setup.'
      Write-Host ""
      Write-Host "✅ Native environment prepared. Services were not started (-SkipStart)." -ForegroundColor Green
      Write-Host "  Backend:  cd backend ; python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000" -ForegroundColor Cyan
      if ($hasNode) {
        Write-Host "  Frontend: cd frontend ; npm run dev" -ForegroundColor Cyan
      }
      Write-Host ""
      return 0
    }

    [void](Start-NativeBackendProcess -EnableVerboseLogging:$EnableVerboseLogging)
    Start-Sleep -Seconds 3

    $backendReady = Wait-ServiceReady -Urls @('http://127.0.0.1:8000/health', 'http://localhost:8000/health') -TimeoutSec 90
    if (-not $backendReady) {
      Write-Log 'Backend failed to report ready state in native mode' 'ERROR'
      Write-Host "⚠️  Backend did not signal readiness. Check the backend PowerShell window for details." -ForegroundColor Yellow
      return 1
    }

    $frontendStarted = $false
    if ($hasNode) {
      try {
        Start-NativeFrontendProcess | Out-Null
        $frontendStarted = $true
      } catch {
        Write-Log "Failed to start frontend dev server: $($_.Exception.Message)" 'WARN'
        Write-Host "⚠️  Frontend dev server failed to start automatically. Run 'cd frontend; npm run dev' manually." -ForegroundColor Yellow
      }
    }

    Write-Host ""
    Write-Host "✅ Native stack is up and running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "  API:      http://localhost:8000" -ForegroundColor Green
    Write-Host "  Control:  http://localhost:8000/control" -ForegroundColor Green
    Write-Host "  Health:   http://localhost:8000/health" -ForegroundColor Green
    if ($frontendStarted) {
      Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
    } elseif ($hasNode) {
      Write-Host "  Frontend: http://localhost:5173 (start manually with 'npm run dev')" -ForegroundColor Yellow
    } else {
      Write-Host "  Frontend: skipped (Node.js not detected)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "To stop services, close the backend/frontend PowerShell windows or run .\SMS.ps1 -Stop." -ForegroundColor Yellow

    Write-Log 'Native setup completed successfully'
    return 0
  } catch {
    Write-Log "Native setup failed: $($_.Exception.Message)" 'ERROR'
    Write-Host "❌ Native setup failed: $($_.Exception.Message)" -ForegroundColor Red
    return 1
  }
}

# ===== MAIN =====
"==== SMART_SETUP started $(Get-Date) ====" | Out-File -FilePath $logPath -Encoding utf8 -Force
Write-Log "Student Management System - Setup v1.4.1"

if ($PreferNative -and $DevMode) {
  Write-Log "PreferNative cannot be used together with DevMode" 'ERROR'
  Write-Host "❌ PreferNative cannot be combined with -DevMode. Choose one workflow." -ForegroundColor Red
  exit 1
}

if ($PreferNative) {
  $nativeExit = Invoke-NativeSetup -ForceInstall:$Force -SkipStart:$SkipStart -EnableVerboseLogging:$Verbose
  exit $nativeExit
}

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
      -v "${root}/backups:/app/backups" `
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
