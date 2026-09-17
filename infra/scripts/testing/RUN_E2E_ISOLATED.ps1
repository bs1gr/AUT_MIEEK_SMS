<#
.SYNOPSIS
    Run the Playwright E2E suite against a disposable, freshly seeded database.

.DESCRIPTION
    Local E2E runs used to point at whatever DATABASE_URL the developer machine is configured
    with - here, the real development PostgreSQL. Every run then wrote students, courses and
    accounts into it: 234 stray accounts had to be cleared by hand on 2026-09-16. The specs now
    tidy up after themselves, but a crashed run still cannot, and specs that do not use
    TestDataTracker are not covered at all.

    This script removes the problem at the source. It creates a throwaway SQLite database in the
    temp directory, migrates and seeds it with backend/seed_e2e_data.py, starts a backend bound
    to it, runs Playwright, and then stops the backend and deletes the database. Nothing it does
    can reach the development database.

    It is the same recipe .github/workflows/e2e-tests.yml uses, so a local run now matches CI -
    including the seeded accounts. In a seeded database test@example.com is an *admin*, which is
    what the specs were originally written against; against the dev PostgreSQL it is a teacher.

.PARAMETER Spec
    Test file or directory to run, relative to src/frontend (default: all E2E specs).

.PARAMETER Grep
    Only run tests whose title matches this pattern.

.PARAMETER Project
    Playwright project (browser). Defaults to chromium.

.PARAMETER KeepDatabase
    Leave the throwaway database on disk and print its path, for debugging a failure.

.EXAMPLE
    .\infra\scripts\testing\RUN_E2E_ISOLATED.ps1

.EXAMPLE
    .\infra\scripts\testing\RUN_E2E_ISOLATED.ps1 -Spec tests/e2e/student-management.spec.ts -Grep "assign grade"
#>
[CmdletBinding()]
param(
    [string]$Spec = 'tests/e2e',
    [string]$Grep,
    [string]$Project = 'chromium',
    [switch]$KeepDatabase
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$frontendDir = Join-Path $repoRoot 'src\frontend'
$backendPort = 8000

function Write-Step($message) { Write-Host "`n=== $message ===" -ForegroundColor Cyan }
function Write-Ok($message) { Write-Host "  OK  $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "  !   $message" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# Refuse to reuse a backend we did not start.
#
# This is the whole point of the script: an already-running backend is almost certainly the one
# NATIVE.ps1 started against the development database, and Playwright would silently test
# against that instead - writing exactly the rows this script exists to avoid.
# ---------------------------------------------------------------------------
$listening = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host ""
    Write-Host "Port $backendPort is already in use." -ForegroundColor Red
    Write-Host "Something is already serving the backend - most likely NATIVE.ps1, which is bound to" -ForegroundColor Red
    Write-Host "the development database. Running the suite now would write test rows into it." -ForegroundColor Red
    Write-Host ""
    Write-Host "Stop it first:  .\infra\scripts\dev\NATIVE.ps1 -Stop" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# Throwaway database
# ---------------------------------------------------------------------------
# The database has to live inside the repository: config.py validates that a SQLite path sits
# under an allowed root and rejects anything else (including the system temp directory), which
# is why CI puts its database in the workspace too. data/e2e-runs/ is gitignored.
$runId = Get-Date -Format 'yyyyMMdd_HHmmss'
$runsRoot = Join-Path $repoRoot 'data\e2e-runs'
$runDir = Join-Path $runsRoot $runId
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

# SQLAlchemy wants forward slashes, including on Windows: sqlite:///D:/path/e2e.db
$dbPath = (Join-Path $runDir 'e2e.db') -replace '\\', '/'
$databaseUrl = "sqlite:///$dbPath"

Write-Step "Disposable database"
Write-Host "  $databaseUrl"

$backendProcess = $null
$exitCode = 1
$cleanupFailed = $false

# Remember the caller's environment so the throwaway settings cannot outlive this script. Dot-
# sourcing it, or simply running other commands in the same shell afterwards, would otherwise
# inherit DATABASE_URL pointing at a database that no longer exists.
$envKeys = @(
    'DATABASE_URL', 'PYTHONPATH', 'CSRF_ENABLED', 'AUTH_MODE',
    'AUTH_LOGIN_THROTTLE_ENABLED', 'AUTH_USER_LOCKOUT_ENABLED', 'SERVE_FRONTEND',
    'VITE_API_URL', 'VITE_DEV_PROXY_TARGET', 'PLAYWRIGHT_BASE_URL'
)
$savedEnv = @{}
foreach ($key in $envKeys) { $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key) }

try {
    # Settings are read at import time, so these must be set before any Python starts.
    $env:DATABASE_URL = $databaseUrl
    $env:PYTHONPATH = Join-Path $repoRoot 'src'
    # Matches the E2E workflow, so local behaviour matches CI.
    $env:CSRF_ENABLED = '0'
    $env:AUTH_MODE = 'permissive'
    $env:AUTH_LOGIN_THROTTLE_ENABLED = '0'
    $env:AUTH_USER_LOCKOUT_ENABLED = '0'
    # The suite drives its own frontend through Vite; don't make the backend serve a stale build.
    $env:SERVE_FRONTEND = '0'
    # Leave PLAYWRIGHT_BASE_URL unset so playwright.config.ts starts Vite itself.
    Remove-Item Env:\PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue

    # Same two variables NATIVE.ps1 sets, and they matter more than they look. With a relative
    # API base the frontend's requests go to Vite on 5173 and are proxied to the backend, so they
    # stay same-origin and the browser attaches the HttpOnly refresh_token cookie. Without them
    # the frontend calls port 8000 directly, the refresh becomes cross-origin, the cookie is not
    # sent, POST /api/v1/auth/refresh answers 401 and every loginViaAPI spec dies on the login
    # page. Playwright starts Vite itself here, so nothing else would set these.
    $env:VITE_API_URL = '/api/v1'
    $env:VITE_DEV_PROXY_TARGET = "http://127.0.0.1:$backendPort"

    Write-Step "Migrating"
    Push-Location $repoRoot
    try {
        python -c "from backend.run_migrations import run_migrations; raise SystemExit(0 if run_migrations() else 1)"
        if ($LASTEXITCODE -ne 0) { throw "Alembic migrations failed against the throwaway database." }
        Write-Ok "schema created"

        Write-Step "Seeding"
        python src/backend/seed_e2e_data.py
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "seed failed, retrying with force"
            python -c "from backend.seed_e2e_data import seed_e2e_data; seed_e2e_data(force=True)"
            if ($LASTEXITCODE -ne 0) { throw "Seeding the throwaway database failed." }
        }

        python src/backend/validate_e2e_data.py
        if ($LASTEXITCODE -ne 0) { throw "Seed validation failed; the database is not usable for E2E." }
        Write-Ok "seeded and validated"

        Write-Step "Starting backend"
        $backendProcess = Start-Process -FilePath 'python' `
            -ArgumentList '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', "$backendPort" `
            -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $runDir 'backend.out.log') `
            -RedirectStandardError (Join-Path $runDir 'backend.err.log')
    }
    finally {
        Pop-Location
    }

    $healthy = $false
    foreach ($attempt in 1..60) {
        if ($backendProcess.HasExited) {
            throw "Backend exited during startup (code $($backendProcess.ExitCode)). See $runDir\backend.err.log"
        }
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/health" -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) { $healthy = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }
    if (-not $healthy) { throw "Backend did not become healthy. See $runDir\backend.err.log" }
    Write-Ok "backend healthy on port $backendPort (throwaway database)"

    Write-Step "Running Playwright"
    $playwrightArgs = @('playwright', 'test', $Spec, '--project', $Project)
    if ($Grep) { $playwrightArgs += @('--grep', $Grep) }

    Push-Location $frontendDir
    try {
        & npx @playwrightArgs
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
finally {
    foreach ($key in $envKeys) {
        if ($null -eq $savedEnv[$key]) { Remove-Item "Env:\$key" -ErrorAction SilentlyContinue }
        else { Set-Item "Env:\$key" $savedEnv[$key] }
    }

    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Step "Stopping backend"
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        try {
            $backendProcess.WaitForExit(10000)
        }
        catch {
            Write-Warn "Could not confirm backend process termination: $($_.Exception.Message)"
        }
        if ($backendProcess.HasExited) { Write-Ok "stopped" }
        else { Write-Warn "Backend process is still running (PID $($backendProcess.Id))"; $cleanupFailed = $true }
    }

    if ($KeepDatabase) {
        Write-Warn "Database kept at: $runDir"
    }
    elseif ($runDir -and $runsRoot -and $runDir.StartsWith($runsRoot)) {
        # Guarded by the data/e2e-runs prefix so this can only ever remove a run of its own.
        try {
            Remove-Item -Recurse -Force -Path $runDir -ErrorAction Stop
            if (Test-Path -LiteralPath $runDir) {
                throw "The run directory still exists after removal."
            }
            Write-Ok "throwaway database removed"
        }
        catch {
            Write-Warn "Could not remove throwaway database: $($_.Exception.Message)"
            Write-Warn "Inspect or remove it manually: $runDir"
            $cleanupFailed = $true
        }
    }
}

if ($cleanupFailed -and $exitCode -eq 0) {
    $exitCode = 1
}

if ($exitCode -eq 0) {
    Write-Host "`nE2E suite passed against a disposable database." -ForegroundColor Green
}
else {
    Write-Host "`nE2E suite failed (exit $exitCode). Re-run with -KeepDatabase to inspect the data." -ForegroundColor Red
}
exit $exitCode
