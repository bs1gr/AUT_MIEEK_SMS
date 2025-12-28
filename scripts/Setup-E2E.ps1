[CmdletBinding()]
param(
  [switch]$SkipBackendInstall,
  [switch]$SkipSeed,
  [switch]$SkipFrontend,
  [switch]$UseCurrentPython
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Step($msg) { Write-Host "[step] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-ErrMsg($msg) { Write-Host "[err ] $msg" -ForegroundColor Red }

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$backendPath = Join-Path $repoRoot 'backend'
$frontendPath = Join-Path $repoRoot 'frontend'
$venvPath = Join-Path $repoRoot '.venv'

function Resolve-Python {
  param(
    [switch]$AllowNon311
  )
  $candidates = @(
    @{ Cmd = 'py'; Args = @('-3.11') },
    @{ Cmd = 'python3.11'; Args = @() },
    @{ Cmd = 'py'; Args = @('-3') },
    @{ Cmd = 'python'; Args = @() }
  )

  foreach ($c in $candidates) {
    try {
      $cmd = $c.Cmd
      $args = $c.Args
      $version = & $cmd @args '-c' 'import sys; print(sys.version_info[:2])' 2>$null
      if ($LASTEXITCODE -eq 0) {
        $argString = ''
        if ($args.Count -gt 0) { $argString = ' ' + ($args -join ' ') }
        if ($version -match '\(3, 11\)') { return [pscustomobject]@{ Cmd = $cmd; Args = $args } }
        elseif ($AllowNon311) {
          Write-Warn "Using $cmd $($args -join ' ') (version $version). psycopg2-binary may compile if wheel unavailable."
          return [pscustomobject]@{ Cmd = $cmd; Args = $args }
        }
      }
    } catch {}
  }
  throw "Python 3.11 not found. Install Python 3.11 or rerun with -UseCurrentPython to allow your default version."
}

function Ensure-Venv {
  param($pythonSpec, $path)
  if (Test-Path $path) { return }
  Write-Step "Creating venv at $path"
  & $($pythonSpec.Cmd) @($pythonSpec.Args) -m venv $path
}

function Pip-Install {
  param($venvPython, $reqPath)
  Write-Step 'Upgrading pip/setuptools/wheel'
  & $venvPython -m pip install --upgrade pip setuptools wheel
  Write-Step 'Installing backend requirements (prefer wheels)'
  $env:PIP_PREFER_BINARY = '1'
  & $venvPython -m pip install -r $reqPath
  if ($LASTEXITCODE -ne 0) {
    Write-Warn 'pip install -r requirements.txt failed. Attempting psycopg2-binary workaround for non-3.11 Python.'
    $tmpReq = Join-Path $env:TEMP 'requirements_no_psycopg2.txt'
    $lines = Get-Content -LiteralPath $reqPath
    $filtered = $lines | Where-Object { $_ -notmatch '^psycopg2-binary' }
    Set-Content -LiteralPath $tmpReq -Value $filtered -Encoding UTF8
    Write-Step 'Installing requirements without psycopg2-binary'
    & $venvPython -m pip install -r $tmpReq
    if ($LASTEXITCODE -ne 0) { throw 'pip fallback install failed' }
    Write-Step 'Installing compatible psycopg2-binary (2.9.11) for Python >= 3.12'
    & $venvPython -m pip install psycopg2-binary==2.9.11
  }

  # Verify key deps exist; if not, install explicitly
  Write-Step 'Verifying backend dependencies'
  & $venvPython -c "import sqlalchemy, fastapi, alembic; print('deps_ok')" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn 'Critical backend packages missing; installing explicitly'
    & $venvPython -m pip install sqlalchemy==2.0.44 fastapi==0.121.2 alembic==1.17.0
    & $venvPython -c "import sqlalchemy, fastapi, alembic; print('deps_ok')" 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependencies verification failed' }
  }
}

function Seed-Data {
  param($venvPython)
  Write-Step 'Seeding E2E data'
  Push-Location $repoRoot
  & $venvPython backend/seed_e2e_data.py
  Pop-Location
}

function Clean-NodeModules {
  param($path)
  Write-Step 'Cleaning node_modules (if present)'
  if (Test-Path (Join-Path $path 'node_modules')) {
    try {
      taskkill /f /im esbuild.exe 2>$null | Out-Null
      taskkill /f /im node.exe 2>$null | Out-Null
    } catch {}
    try {
      Remove-Item -LiteralPath (Join-Path $path 'node_modules') -Recurse -Force -ErrorAction Stop
    } catch {
      Write-Warn 'Failed to remove node_modules due to locked files; retrying with cmd rmdir'
      cmd /c rmdir /s /q "$(Join-Path $path 'node_modules')" 2>nul
      if (Test-Path (Join-Path $path 'node_modules')) {
        $stamp = Get-Date -Format 'yyyyMMddHHmmss'
        $backup = Join-Path $path ("node_modules.locked.$stamp")
        Write-Warn "Renaming node_modules to $backup"
        try { Rename-Item -LiteralPath (Join-Path $path 'node_modules') -NewName (Split-Path $backup -Leaf) -ErrorAction Stop } catch {}
      }
    }
  }
}

function Npm-Install {
  param($path)
  Write-Step 'Running npm ci'
  Push-Location $path
  npm ci
  Write-Step 'Installing Playwright browsers (chromium)'
  npx playwright install chromium --with-deps
  Pop-Location
}

try {
  $pySpec = Resolve-Python -AllowNon311:$UseCurrentPython
  Write-Info "Using Python command: $($pySpec.Cmd) $($pySpec.Args -join ' ')"

  if (-not $SkipBackendInstall) {
    Ensure-Venv -pythonSpec $pySpec -path $venvPath
    $venvPython = Join-Path $venvPath 'Scripts/python.exe'
    Write-Info "venv Python: $venvPython"
    Pip-Install -venvPython $venvPython -reqPath (Join-Path $backendPath 'requirements.txt')
  } else {
    $venvPython = Join-Path $venvPath 'Scripts/python.exe'
  }

  if (-not $SkipSeed) {
    Seed-Data -venvPython $venvPython
  }

  if (-not $SkipFrontend) {
    Clean-NodeModules -path $frontendPath
    Npm-Install -path $frontendPath
  }

  Write-Host "\nAll done. Next steps:" -ForegroundColor Green
  Write-Host "  - Start backend: $venvPython -m uvicorn backend.main:app --host 127.0.0.1 --port 8000" -ForegroundColor Green
  Write-Host "    (envs) DISABLE_STARTUP_TASKS=1 CSRF_ENABLED=0 AUTH_MODE=permissive SERVE_FRONTEND=1" -ForegroundColor Green
  Write-Host "  - Run E2E: cd frontend; PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000 npm run e2e -- --reporter=list --workers=1" -ForegroundColor Green
}
catch {
  Write-ErrMsg $_
  exit 1
}
