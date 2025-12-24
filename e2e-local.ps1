<#
.SYNOPSIS
    Run local E2E tests with backend and frontend served by FastAPI (like CI)

.DESCRIPTION
    - Seeds E2E test data
    - Starts backend with SERVE_FRONTEND=1, AUTH_MODE=permissive, CSRF_ENABLED=0
    - Runs Playwright E2E tests with PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000
    - Cleans up backend process after tests

.EXAMPLE
    .\e2e-local.ps1
#>

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $SCRIPT_DIR 'backend'
$FRONTEND_DIR = Join-Path $SCRIPT_DIR 'frontend'
$DATA_DIR = Join-Path $SCRIPT_DIR 'data'

# 1. Seed E2E data
Write-Host 'Seeding E2E test data...'
python $BACKEND_DIR/seed_e2e_data.py

# 2. Start backend (serves frontend) in background
Write-Host 'Starting backend (FastAPI, SERVE_FRONTEND=1, AUTH_MODE=permissive)...'
$env:SERVE_FRONTEND = '1'
$env:AUTH_MODE = 'permissive'
$env:CSRF_ENABLED = '0'
$env:DISABLE_STARTUP_TASKS = '1'
$backendProc = Start-Process python -ArgumentList '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000' -WorkingDirectory $SCRIPT_DIR -PassThru
Start-Sleep -Seconds 5

# 3. Wait for backend health
$maxTries = 30
for ($i = 0; $i -lt $maxTries; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
            Write-Host 'Backend is ready.'
            break
        }
    } catch {}
    Write-Host "Waiting for backend... ($($i+1)/$maxTries)"
    Start-Sleep -Seconds 1
}

# 4. Run Playwright E2E tests
Write-Host 'Running Playwright E2E tests...'
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:8000'
cd $FRONTEND_DIR
npm run e2e
$e2eStatus = $LASTEXITCODE
cd $SCRIPT_DIR

# 5. Cleanup backend
Write-Host 'Stopping backend...'
Stop-Process -Id $backendProc.Id -Force

if ($e2eStatus -eq 0) {
    Write-Host 'E2E tests passed.' -ForegroundColor Green
    exit 0
} else {
    Write-Host 'E2E tests failed.' -ForegroundColor Red
    exit $e2eStatus
}
