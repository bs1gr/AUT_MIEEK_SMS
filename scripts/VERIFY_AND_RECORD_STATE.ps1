<#
.SYNOPSIS
    Verify and record current workspace state to prevent data loss.

.DESCRIPTION
    Creates a timestamped Markdown report under artifacts/state capturing:
    - Version info and quick validation
    - Git branch, commit, status (staged/unstaged/untracked)
    - Pre-commit quick validation output (COMMIT_READY -Quick)
    - Test results summary (if available)
    - Backups inventory (latest file)
    - Environment file presence (.env, .env.production.SECURE)
    - Optional notes for migration/alembic status

.NOTES
    Safe to run anytime. Does NOT run heavy tests; uses existing results if present.
#>

param(
    [Parameter()][switch]$VerboseMode
)

$ErrorActionPreference = 'Continue'

function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$Timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$StateDir = Join-Path $ROOT 'artifacts\state'
if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir | Out-Null }

$ReportPath = Join-Path $StateDir "STATE_${Timestamp}.md"
$CommitReadyLog = Join-Path $StateDir "COMMIT_READY_${Timestamp}.log"

function Append($text) { Add-Content -Path $ReportPath -Value $text }
function Section($title) {
    Append "\n## $title\n"
}

# Header
Append "# Workspace State Snapshot"
Append "\nGenerated: $((Get-Date).ToString('u'))"

# Version
Section 'version'
try {
    $versionFile = Join-Path $ROOT 'VERSION'
    if (Test-Path $versionFile) {
        $version = (Get-Content $versionFile -Raw).Trim()
        Append ("- VERSION: $version")
        # Quick CI-mode check (VERSION vs frontend/package.json)
        $verifyScript = Join-Path $ROOT 'scripts\VERIFY_VERSION.ps1'
        if (Test-Path $verifyScript) {
            Append ("- Running quick version validation (CI mode)...")
            $ciOut = & pwsh -NoProfile -ExecutionPolicy Bypass -File $verifyScript -CIMode 2>&1
            if ($LASTEXITCODE -eq 0) {
                Append ("  - Result: OK")
            } else {
                Append ("  - Result: FAILED")
                Append ("  - Output:")
                Append ($ciOut | Out-String)
            }
        } else {
            Append ("- VERIFY_VERSION.ps1 not found (skipping CI-mode check)")
        }
    } else {
        Append ("- VERSION file missing")
    }
} catch { Append ("- Error reading VERSION: $($_.Exception.Message)") }

# Git status
Section 'git status'
try {
    Push-Location $ROOT
    $branch = (git branch --show-current) 2>$null
    $commit = (git rev-parse HEAD) 2>$null
    $remote = (git remote -v) 2>$null
    $porcelain = (git status --porcelain=v1) 2>$null
    Append ("- Branch: $branch")
    Append ("- Commit: $commit")
    Append ("- Remote:")
    Append ('```' + [Environment]::NewLine + ($remote | Out-String) + '```')
    if ($porcelain) {
        Append ('- Changes:')
        Append ('```' + [Environment]::NewLine + ($porcelain | Out-String) + '```')
    } else {
        Append ('- Changes: none')
    }
    Pop-Location
} catch { Append ("- Error collecting git status: $($_.Exception.Message)") }

# COMMIT_READY quick validation
Section 'pre-commit quick validation'
try {
    $commitReady = Join-Path $ROOT 'COMMIT_READY.ps1'
    if (Test-Path $commitReady) {
        Append ("- Running COMMIT_READY -Quick (capturing to log)")
        $output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $commitReady -Quick 2>&1 | Tee-Object -FilePath $CommitReadyLog
        Append ("- Log: $(Split-Path -Leaf $CommitReadyLog)")
        # Light success heuristic
        if (($output | Select-String -Pattern 'Version verification completed successfully').Length -gt 0) {
            Append ("- Summary: Version verification OK")
        }
        Append ("- Preview:" + [Environment]::NewLine + ('```' + [Environment]::NewLine + (($output | Select-String -Pattern 'Verification Summary|Consistent|Failed' -SimpleMatch) | Out-String) + '```'))
    } else {
        Append ("- COMMIT_READY.ps1 not found")
    }
} catch { Append ("- Error running COMMIT_READY: $($_.Exception.Message)") }

# Test results summary (non-invasive)
Section 'test results summary (existing artifacts)'
try {
    $backendFull = Join-Path $ROOT 'test-results\backend_batch_full.txt'
    if (Test-Path $backendFull) {
        $content = Get-Content $backendFull -Raw
        $passedBatches = ([regex]::Matches($content, '✓ Batch')).Count
        $failedBatches = ([regex]::Matches($content, '✗ Batch|FAILED|ERROR')).Count
        Append ("- Backend batch file: present")
        Append ("- Batches passed: $passedBatches")
        Append ("- Batches failed: $failedBatches")
    } else {
        Append ("- Backend batch results not found (run RUN_TESTS_BATCH.ps1 to generate)")
    }
    $frontendJUnit = Join-Path $ROOT 'artifacts\frontend\junit.xml'
    if (Test-Path $frontendJUnit) {
        Append ("- Frontend JUnit report: present")
    } else {
        Append ("- Frontend JUnit report: not found")
    }
} catch { Append ("- Error reading test artifacts: $($_.Exception.Message)") }

# Backups inventory
Section 'backups inventory'
try {
    $backupsDir = Join-Path $ROOT 'backups'
    if (Test-Path $backupsDir) {
        $files = Get-ChildItem $backupsDir -File | Sort-Object LastWriteTime -Descending
        if ($files.Count -gt 0) {
            $latest = $files[0]
            Append ("- Latest backup: $($latest.Name) ($([Math]::Round($latest.Length/1MB,2)) MB) at $($latest.LastWriteTime.ToString('u'))")
        } else {
            Append ('- No backup files found')
        }
    } else {
        Append ('- Backups directory not found')
    }
} catch { Append ("- Error listing backups: $($_.Exception.Message)") }

# Environment files presence
Section 'environment files'
try {
    $envRoot = Join-Path $ROOT '.env'
    $envProd = Join-Path $ROOT '.env.production.SECURE'
    Append ("- .env present: $((Test-Path $envRoot) -as [string])")
    Append ("- .env.production.SECURE present: $((Test-Path $envProd) -as [string])")
} catch { Append "- Error checking env files: $($_.Exception.Message)" }

# Alembic/migrations (non-executing)
Section 'migrations overview (non-executing)'
try {
    $migrationsDir = Join-Path $ROOT 'backend\migrations'
    if (Test-Path $migrationsDir) {
        $mig = Get-ChildItem $migrationsDir -Filter '*.py' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 3
        Append ('- Latest migration files:')
        foreach ($m in $mig) { Append ("  - $($m.Name) ($($m.LastWriteTime.ToString('u')))" ) }
    } else {
        Append ('- Migrations directory not found')
    }
} catch { Append ("- Error reviewing migrations: $($_.Exception.Message)") }

# Footer
Append "\n---\nReport path: $ReportPath"
Write-Ok "State snapshot saved: $ReportPath"
Write-Ok "COMMIT_READY log saved: $CommitReadyLog"
