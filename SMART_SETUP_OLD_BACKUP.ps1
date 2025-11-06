<#
.SYNOPSIS
  Intelligent setup and start for Student Management System (Docker-only Release)

.DESCRIPTION
  - RELEASE VERSION 1.3.8: Requires Docker (no native mode support)
  - Detects first-time vs existing installation
  - Checks Docker availability and fails if not found
  - Installs missing dependencies automatically
  - Initializes database via Alembic
  - Starts the application in Docker mode (port 8080)
  - Writes logs to setup.log

.PARAMETER PreferDocker
  (Ignored - Docker is always used in release mode)

.PARAMETER PreferNative
  (Ignored - Native mode not supported in release version)

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

function Get-SmsRuntimeEnvironment {
  param([string]$Fallback = 'development')
  if ($env:SMS_ENV) {
    return $env:SMS_ENV.Trim().ToLower()
  }

  $candidateFiles = @(
    Join-Path $root 'backend' '.env',
    Join-Path $root '.env'
  )

  foreach ($file in $candidateFiles) {
    if (-not (Test-Path $file)) { continue }
    foreach ($line in Get-Content -LiteralPath $file) {
      $trim = $line.Trim()
      if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
      $match = [regex]::Match($trim, '^\s*SMS_ENV\s*=\s*(.+)$', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($match.Success) {
        $value = $match.Groups[1].Value.Trim().Trim('"').Trim("'")
        if ($value) { return $value.ToLower() }
      }
    }
  }

  return $Fallback
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

# RELEASE VERSION: Docker-only mode - skip dependency installation
# Dependencies are installed inside Docker containers during build
Write-Log "RELEASE MODE: Skipping host dependency installation (Docker handles this)" 'INFO'

# Decide mode - RELEASE VERSION: DOCKER ONLY
$mode = 'docker'
Write-Log "RELEASE MODE: Docker deployment required" 'INFO'

if (-not $hasDocker) {
    Write-Log "ERROR: Docker is required for this release version but is not available" 'ERROR'
    Write-Host ""
    Write-Host "This is a release version (1.3.8) that requires Docker to run." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host ""
    throw 'Docker is required but not available'
}

if ($PreferNative) {
    Write-Log "WARNING: PreferNative flag ignored - release version requires Docker" 'WARN'
}

Write-Log "Selected mode: $mode"

if ($SkipStart) { Write-Log 'SkipStart requested. Setup complete.'; exit 0 }

if ($mode -eq 'docker') {
  if (-not $hasDocker) { throw 'Docker not available' }
  # Ensure compose gets VERSION from root VERSION file
  Set-ComposeEnvVersion
  $composeFiles = @('docker-compose.yml')
  $prodOverlayPath = Join-Path $root 'docker-compose.prod.yml'
  if (Test-Path $prodOverlayPath) {
    $composeFiles += 'docker-compose.prod.yml'
  }

  $composeArgs = @()
  foreach ($file in $composeFiles) {
    $composeArgs += '-f'
    $composeArgs += $file
  }
  $composeArgs += 'up'
  $composeArgs += '-d'
  $composeArgs += '--build'

  Write-Log ("Starting Docker Compose (detached, build) with files: {0}" -f ($composeFiles -join ', '))
  Push-Location $root
  try {
    docker compose @composeArgs | ForEach-Object { Write-Log $_ }
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
  # This should never be reached in release version
  Write-Log "ERROR: Unexpected mode '$mode' - release version only supports Docker" 'ERROR'
  throw "Invalid mode: $mode (expected 'docker')"
}
