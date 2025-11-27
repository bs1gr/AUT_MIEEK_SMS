#!/usr/bin/env pwsh
<#
.SYNOPSIS
Pre-commit hook to catch common issues before commit.

.DESCRIPTION
Runs quick validation checks:
- Backend: pytest (fast unit tests only)
- Frontend: ESLint i18n checks
- Frontend: Translation integrity tests

Exit code 0 = all checks passed
Exit code 1 = checks failed

.EXAMPLE
.\PRE_COMMIT_HOOK.ps1
#>

param(
    [switch]$SkipTests,
    [switch]$SkipLint,
    [switch]$SkipI18n
)

$ErrorActionPreference = "Stop"
$script:FailureCount = 0

function Write-Check {
    param([string]$Message)
    Write-Host "🔍 $Message" -ForegroundColor Cyan
}

function Write-Pass {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    $script:FailureCount++
}

Write-Host "`n=== Pre-Commit Validation ===" -ForegroundColor Yellow

# Backend quick tests
if (-not $SkipTests) {
    Write-Check "Running backend quick tests..."
    Push-Location "$PSScriptRoot\backend"
    try {
        # Run only fast unit tests (exclude integration tests)
        $result = pytest tests/ -m "not slow" -q --tb=no 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "Backend tests passed"
        } else {
            Write-Fail "Backend tests failed"
            Write-Host $result -ForegroundColor Gray
        }
    } catch {
        Write-Fail "Backend tests error: $_"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️  Skipping backend tests" -ForegroundColor Gray
}

# Frontend ESLint i18n checks
if (-not $SkipLint) {
    Write-Check "Running ESLint i18n checks..."
    Push-Location "$PSScriptRoot\frontend"
    try {
        # Run eslint focusing on i18next rules
        $result = npm run lint -- --quiet 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "ESLint checks passed"
        } else {
            Write-Fail "ESLint found issues"
            Write-Host $result -ForegroundColor Gray
        }
    } catch {
        Write-Fail "ESLint error: $_"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️  Skipping ESLint checks" -ForegroundColor Gray
}

# Frontend translation integrity tests
if (-not $SkipI18n) {
    Write-Check "Running translation integrity tests..."
    Push-Location "$PSScriptRoot\frontend"
    try {
        $result = npm run test -- run src/i18n/__tests__/translations.test.ts --reporter=basic 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "Translation integrity verified"
        } else {
            Write-Fail "Translation integrity issues found"
            Write-Host $result -ForegroundColor Gray
        }
    } catch {
        Write-Fail "Translation tests error: $_"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️  Skipping translation checks" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Yellow
if ($script:FailureCount -eq 0) {
    Write-Host "✅ All checks passed! Safe to commit." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ $script:FailureCount check(s) failed. Fix issues before committing." -ForegroundColor Red
    Write-Host "`nTip: Use -SkipTests, -SkipLint, or -SkipI18n to bypass specific checks during development." -ForegroundColor Gray
    exit 1
}
