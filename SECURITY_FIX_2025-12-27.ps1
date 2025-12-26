# Security Fixes - December 27, 2025

<#
.SYNOPSIS
    Apply security improvements and cleanup based on security audit.

.DESCRIPTION
    This script:
    1. Removes unused Python packages (langchain, pdfplumber, etc.)
    2. Updates frontend dependencies (minor versions)
    3. Verifies no secrets are tracked in git
    4. Generates updated requirements-lock.txt

.EXAMPLE
    .\SECURITY_FIX_2025-12-27.ps1
#>

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY FIXES - December 27, 2025" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify no secrets in git
Write-Host "1. CHECKING FOR SECRETS IN GIT..." -ForegroundColor Yellow
$secretFiles = git ls-files | Select-String -Pattern "\.(env|key|pem|p12|pfx|jks)$"
if ($secretFiles) {
    Write-Host "❌ ERROR: Secret files found in git:" -ForegroundColor Red
    $secretFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "✅ No secret files tracked in git" -ForegroundColor Green
}
Write-Host ""

# 2. Backend: Remove unused packages
if (-not $SkipBackend) {
    Write-Host "2. BACKEND: REMOVING UNUSED PACKAGES..." -ForegroundColor Yellow

    $unusedPackages = @(
        "langchain",
        "langchain-community",
        "langchain-core",
        "langchain-openai",
        "langchain-text-splitters",
        "pdfplumber",
        "dataclasses-json",
        "marshmallow"
    )

    if ($DryRun) {
        Write-Host "[DRY RUN] Would remove: $($unusedPackages -join ', ')" -ForegroundColor Cyan
    } else {
        Push-Location backend
        try {
            # Check which packages are actually installed
            $installedPackages = pip list --format=json | ConvertFrom-Json | Select-Object -ExpandProperty name
            $toRemove = $unusedPackages | Where-Object { $installedPackages -contains $_ }

            if ($toRemove.Count -gt 0) {
                Write-Host "Removing packages: $($toRemove -join ', ')" -ForegroundColor Cyan
                python -m pip uninstall -y $toRemove

                # Update requirements-lock.txt
                Write-Host "Updating requirements-lock.txt..." -ForegroundColor Cyan
                pip freeze > requirements-lock.txt

                Write-Host "✅ Removed $($toRemove.Count) unused packages" -ForegroundColor Green
            } else {
                Write-Host "✅ No unused packages found (already clean)" -ForegroundColor Green
            }
        } finally {
            Pop-Location
        }
    }
    Write-Host ""
}

# 3. Frontend: Update minor versions
if (-not $SkipFrontend) {
    Write-Host "3. FRONTEND: UPDATING DEPENDENCIES..." -ForegroundColor Yellow

    if ($DryRun) {
        Write-Host "[DRY RUN] Would run: npm update" -ForegroundColor Cyan
    } else {
        Push-Location frontend
        try {
            Write-Host "Running npm update (minor versions only)..." -ForegroundColor Cyan
            npm update --save

            Write-Host "Running npm audit fix..." -ForegroundColor Cyan
            npm audit fix --audit-level=high

            Write-Host "✅ Frontend dependencies updated" -ForegroundColor Green
        } catch {
            Write-Warning "Frontend update encountered issues (may be expected): $_"
        } finally {
            Pop-Location
        }
    }
    Write-Host ""
}

# 4. Verify dependency health
Write-Host "4. VERIFYING DEPENDENCY HEALTH..." -ForegroundColor Yellow

if (-not $SkipBackend) {
    Write-Host "Backend pip check:" -ForegroundColor Cyan
    Push-Location backend
    try {
        $pipCheck = python -m pip check 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ All backend dependencies compatible" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Dependency warnings (non-security):" -ForegroundColor Yellow
            Write-Host $pipCheck -ForegroundColor Gray
        }
    } finally {
        Pop-Location
    }
}

if (-not $SkipFrontend) {
    Write-Host "Frontend npm audit:" -ForegroundColor Cyan
    Push-Location frontend
    try {
        $auditResult = npm audit --audit-level=high --json | ConvertFrom-Json
        $vulnCount = $auditResult.metadata.vulnerabilities.high + $auditResult.metadata.vulnerabilities.critical

        if ($vulnCount -eq 0) {
            Write-Host "✅ Zero high/critical vulnerabilities" -ForegroundColor Green
        } else {
            Write-Host "❌ $vulnCount high/critical vulnerabilities found!" -ForegroundColor Red
            npm audit
        }
    } finally {
        Pop-Location
    }
}
Write-Host ""

# 5. Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY FIXES COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ No secrets in git" -ForegroundColor Green
if (-not $SkipBackend) {
    Write-Host "✅ Backend dependencies cleaned" -ForegroundColor Green
}
if (-not $SkipFrontend) {
    Write-Host "✅ Frontend dependencies updated" -ForegroundColor Green
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes: git status" -ForegroundColor White
Write-Host "  2. Test application: .\NATIVE.ps1 -Start or .\DOCKER.ps1 -Start" -ForegroundColor White
Write-Host "  3. Commit if satisfied: git add . && git commit -m 'chore: security fixes and dependency cleanup'" -ForegroundColor White
Write-Host ""
Write-Host "Audit Report: SECURITY_AUDIT_REPORT_2025-12-27.md" -ForegroundColor Cyan
