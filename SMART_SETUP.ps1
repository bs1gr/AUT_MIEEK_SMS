<#
.SYNOPSIS
  Intelligent setup and start for Student Management System

.DESCRIPTION
  - Detects first-time vs existing installation
  - Checks Python, Node.js, Docker availability
  - Installs missing dependencies automatically
  - Initializes database via Alembic
  - Chooses optimal mode (Docker preferred) unless overridden
  - Starts the application (Docker: 8080, Native: 8000 [+5173 if frontend started])
  - Writes logs to setup.log

.PARAMETER PreferDocker
  Force Docker mode (fail if Docker not available)

.PARAMETER PreferNative
  Force Native mode (fail if Python missing)

.PARAMETER Force
  Reinstall backend/frontend dependencies

.PARAMETER SkipStart
  Setup only; do not start services

.PARAMETER Verbose
  Show detailed logs
#>
param(
  [switch]$PreferDocker,
  [switch]$PreferNative,
  [switch]$Force,
  [switch]$SkipStart,
  [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logPath = Join-Path $root 'setup.log'

function Write-Log {
  param([string]$Message,[string]$Level = 'INFO')
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$ts] [$Level] $Message"
  Write-Host $line
  Add-Content -LiteralPath $logPath -Value $line
}

function Test-Cmd {
  param([string]$Name)
  try { return $null -ne (Get-Command $Name -ErrorAction Stop) } catch { return $false }
}

function Set-EnvFromTemplate {
  param([string]$Dir)
  $envFile = Join-Path $Dir '.env'
  $example = Join-Path $Dir '.env.example'
  if (-not (Test-Path $envFile) -and (Test-Path $example)) {
    Copy-Item -LiteralPath $example -Destination $envFile -Force
    Write-Log "Created $envFile from template"
  }
}

function Set-ComposeEnvVersion {
  try {
    $versionFile = Join-Path $root 'VERSION'
    $composeEnv = Join-Path $root '.env'
    $version = 'latest'
    if (Test-Path $versionFile) {
      $v = Get-Content -LiteralPath $versionFile -Raw -ErrorAction Stop
      if ($v) { $version = ($v.Trim()) }
    }
    if (Test-Path $composeEnv) {
      $lines = Get-Content -LiteralPath $composeEnv
      $found = $false
      $newLines = @()
      foreach ($line in $lines) {
        if ($line -match '^(?i)VERSION=') {
          $newLines += "VERSION=$version"
          $found = $true
        } else {
          $newLines += $line
        }
      }
      if (-not $found) { $newLines += "VERSION=$version" }
      Set-Content -LiteralPath $composeEnv -Value $newLines -Encoding UTF8
      Write-Log "Updated .env with VERSION=$version"
    } else {
      Set-Content -LiteralPath $composeEnv -Value @("VERSION=$version") -Encoding UTF8
      Write-Log "Created .env with VERSION=$version"
    }
  } catch {
    Write-Log "Failed to set .env VERSION: $($_.Exception.Message)" 'WARN'
  }
}

function Install-Backend {
  Push-Location (Join-Path $root 'backend')
  try {
    if ($Force) { Write-Log 'Force reinstall backend deps' 'WARN' }
    Write-Log 'Installing backend dependencies (pip)...'
    python -m pip install --disable-pip-version-check -q -U pip
    python -m pip install --disable-pip-version-check -q -r requirements.txt
  } finally { Pop-Location }
}

function Install-Frontend {
  Push-Location (Join-Path $root 'frontend')
  try {
    if ($Force) { Write-Log 'Force reinstall frontend deps' 'WARN' }
    Write-Log 'Installing frontend dependencies (npm ci)...'
    if (Test-Path 'package-lock.json') { npm ci --no-audit --silent } else { npm install --no-audit --silent }
  } finally { Pop-Location }
}

function Invoke-DatabaseMigrations {
  Push-Location (Join-Path $root 'backend')
  try {
    Write-Log 'Running Alembic migrations...'
    if (-not (Test-Path 'alembic.ini')) { throw 'alembic.ini not found in backend' }
    if (-not (Test-Cmd 'alembic')) {
      Write-Log 'Installing alembic CLI (pip)'
      python -m pip install --disable-pip-version-check -q alembic
    }
    alembic upgrade head | ForEach-Object { Write-Log $_ }
  } finally { Pop-Location }
}

function Wait-HttpUp {
  param([string[]]$Urls, [int]$TimeoutSec = 120)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    foreach ($u in $Urls) {
      try {
        $resp = Invoke-WebRequest -Uri $u -Method GET -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $u }
      } catch { }
    }
    Start-Sleep -Seconds 2
  }
  return $null
}

# Start transcript
"==== SMART_SETUP started $(Get-Date) ====" | Out-File -FilePath $logPath -Encoding utf8 -Force

Write-Log 'Detecting tooling...'
$hasPy = Test-Cmd 'python'
$hasNode = Test-Cmd 'node'
$hasDocker = Test-Cmd 'docker'
Write-Log "Python: $hasPy, Node: $hasNode, Docker: $hasDocker"

# Create .env files if templates exist
Set-EnvFromTemplate -Dir (Join-Path $root 'backend')
Set-EnvFromTemplate -Dir (Join-Path $root 'frontend')

# Install deps
if (-not $hasPy) { if ($PreferNative) { throw 'Python not found but PreferNative specified' } }
if ($hasPy) { Install-Backend }
if ($hasNode) { Install-Frontend } else { Write-Log 'Node.js not found; frontend dev server will be skipped' 'WARN' }

# Initialize database
if ($hasPy) { Invoke-DatabaseMigrations } else { Write-Log 'Skipping DB init: Python not available' 'WARN' }

# Decide mode
$mode = $null
if ($PreferDocker -and $PreferNative) { throw 'PreferDocker and PreferNative cannot both be set' }
if ($PreferDocker) { if (-not $hasDocker) { throw 'Docker not available' } $mode = 'docker' }
elseif ($PreferNative) { if (-not $hasPy) { throw 'Python not available' } $mode = 'native' }
else { $mode = ($hasDocker ? 'docker' : 'native') }
Write-Log "Selected mode: $mode"

if ($SkipStart) { Write-Log 'SkipStart requested. Setup complete.'; exit 0 }

if ($mode -eq 'docker') {
  if (-not $hasDocker) { throw 'Docker not available' }
  # Ensure compose gets VERSION from root VERSION file
  Set-ComposeEnvVersion
  Write-Log 'Starting Docker Compose (detached, build)...'
  Push-Location $root
  try {
    docker compose up -d --build | ForEach-Object { Write-Log $_ }
  } finally { Pop-Location }
  $url = Wait-HttpUp -Urls @('http://localhost:8080/health','http://localhost:8080') -TimeoutSec 180
  if (-not $url) { throw 'Docker app did not become ready on port 8080' }
  Write-Log "Service is up: $url"
  Write-Host "Access URLs:" -ForegroundColor Cyan
  Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Green
  Write-Host "  Control:  http://localhost:8080/control" -ForegroundColor Green
  Write-Host "  Health:   http://localhost:8080/health" -ForegroundColor Green
  exit 0
}
else {
  if (-not $hasPy) { throw 'Python not available for native mode' }
  Write-Log 'Starting backend (uvicorn) on http://127.0.0.1:8000 ...'
  $backendCmd = 'python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000'
  Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command","Set-Location -LiteralPath '$root/backend'; $backendCmd" -WindowStyle Minimized | Out-Null
  $url = Wait-HttpUp -Urls @('http://localhost:8000/health','http://127.0.0.1:8000/health') -TimeoutSec 120
  if (-not $url) { throw 'Backend did not become ready on port 8000' }
  Write-Log "Backend is up: $url"
  if ($hasNode) {
    try {
      Write-Log 'Starting frontend (Vite dev server) on http://localhost:5173 ...'
      Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command","Set-Location -LiteralPath '$root/frontend'; npm run dev --silent" -WindowStyle Minimized | Out-Null
    } catch { Write-Log "Failed to start frontend dev server: $($_.Exception.Message)" 'WARN' }
  }
  Write-Host "Access URLs:" -ForegroundColor Cyan
  Write-Host "  API:      http://localhost:8000" -ForegroundColor Green
  Write-Host "  Control:  http://localhost:8000/control" -ForegroundColor Green
  Write-Host "  Health:   http://localhost:8000/health" -ForegroundColor Green
  Write-Host "  Frontend: http://localhost:5173 (if Node installed)" -ForegroundColor Green
  exit 0
}
