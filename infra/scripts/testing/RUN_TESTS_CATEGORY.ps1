#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run tests by category to avoid system freezes
.DESCRIPTION
    Runs tests grouped by category (routers, services, models, etc.)
.PARAMETER Category
    Specific category to run (routers, services, models, all)
.PARAMETER Verbose
    Show detailed output
.EXAMPLE
    .\RUN_TESTS_CATEGORY.ps1 -Category routers
    .\RUN_TESTS_CATEGORY.ps1  # Runs all categories in sequence
#>

param(
    [ValidateSet("all", "routers", "services", "models", "rbac", "auth", "middleware", "other")]
    [string]$Category = "all",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Category Test Runner (SMS v1.15.1)  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Define test categories
$categories = @{
    routers = @(
        "test_routers_students.py"
        "test_routers_courses.py"
        "test_routers_grades.py"
        "test_routers_attendance.py"
        "test_routers_highlights.py"
        "test_routers_performance.py"
        "test_routers_enrollments.py"
        "test_routers_analytics.py"
        "test_routers_admin.py"
    )
    services = @(
        "test_grade_service.py"
        "test_student_service.py"
        "test_encryption_service.py"
        "test_backup_service.py"
    )
    models = @(
        "test_models.py"
        "test_soft_delete_filtering.py"
    )
    rbac = @(
        "test_rbac.py"
        "test_rbac_decorators.py"
        "test_rbac_templates.py"
    )
    auth = @(
        "test_auth.py"
        "test_authentication.py"
        "test_session_management.py"
    )
    middleware = @(
        "test_request_id_middleware.py",
        "test_timing_middleware.py"
    )
    other = @(
        "test_main.py"
        "test_error_handlers.py"
        "test_metrics.py"
        "test_backup_encryption.py"
        "test_health_checks.py"
        "test_rate_limiting.py"
    )
}

# Determine which categories to run
$categoriesToRun = if ($Category -eq "all") {
    $categories.Keys | Sort-Object
} else {
    @($Category)
}

$results = @{
    TotalCategories = $categoriesToRun.Count
    PassedCategories = 0
    FailedCategories = 0
    TotalTests = 0
    PassedTests = 0
    FailedTests = 0
}

$startTime = Get-Date

Push-Location "backend"
try {
    foreach ($cat in $categoriesToRun) {
        $files = $categories[$cat]

        Write-Host "`n┌─────────────────────────────────────────┐" -ForegroundColor Yellow
        Write-Host "│ Category: $($cat.ToUpper())" -ForegroundColor Yellow
        Write-Host "└─────────────────────────────────────────┘" -ForegroundColor Yellow

        # Find existing test files
        $existingFiles = @()
        foreach ($file in $files) {
            if (Test-Path "tests/$file") {
                $existingFiles += "tests/$file"
                Write-Host "  • $file" -ForegroundColor Gray
            }
        }

        if ($existingFiles.Count -eq 0) {
            Write-Info "No test files found for category '$cat'"
            continue
        }

        Write-Info "Running $($existingFiles.Count) test file(s)..."

        # Run tests
        $testPaths = $existingFiles -join " "

        if ($Verbose) {
            $output = python -m pytest $testPaths -v --tb=short 2>&1
        } else {
            $output = python -m pytest $testPaths -q --tb=line 2>&1
        }

        $exitCode = $LASTEXITCODE
        $outputStr = $output -join "`n"

        # Parse results
        if ($outputStr -match "(\d+) passed") {
            $passed = [int]$matches[1]
            $results.PassedTests += $passed
        }
        if ($outputStr -match "(\d+) failed") {
            $failed = [int]$matches[1]
            $results.FailedTests += $failed
        }

        # Display output
        Write-Host $outputStr

        if ($exitCode -eq 0) {
            $results.PassedCategories++
            Write-Success "Category '$cat' passed"
        } else {
            $results.FailedCategories++
            Write-Error "Category '$cat' failed"
        }

        # Delay between categories
        Write-Host "  Waiting 3 seconds..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 3
    }
} finally {
    Pop-Location
}

$duration = ((Get-Date) - $startTime).TotalSeconds

# Summary
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          SUMMARY                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nCategories: $($results.PassedCategories)/$($results.TotalCategories) passed" -ForegroundColor Gray
Write-Host "Tests: $($results.PassedTests) passed, $($results.FailedTests) failed" -ForegroundColor Gray
Write-Host "Duration: $([math]::Round($duration, 1))s`n" -ForegroundColor Gray

if ($results.FailedCategories -eq 0) {
    Write-Success "All categories passed! 🎉"
    exit 0
} else {
    Write-Error "Some categories failed"
    exit 1
}
