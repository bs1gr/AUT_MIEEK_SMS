# Version Format Validator - CRITICAL ENFORCEMENT
# This script validates that all version references use v1.x.x format ONLY
# Blocks forbidden formats: v11.x.x, $11.x.x, v2.x.x
#
# Usage:
#   .\validate_version_format.ps1 [-CheckAll] [-Verbose]
#   Exit code: 0 = pass, 1 = fail

param(
    [switch]$CheckAll,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# CRITICAL: These patterns MUST be rejected
$forbiddenPatterns = @{
    'v11\.' = 'CRITICAL: v11.x.x format breaks version tracking'
    '\$11\.' = 'CRITICAL: $11.x.x format breaks version tracking'
    'v2\.' = 'CRITICAL: v2.x.x uses wrong major version'
}

# ONLY allowed pattern (with or without 'v' prefix)
$allowedPattern = '^v?1\.\d+\.\d+$'

function Test-VersionFormat {
    param(
        [string]$Version,
        [string]$Source = "VERSION file"
    )

    # Check for forbidden patterns
    foreach ($pattern in $forbiddenPatterns.Keys) {
        if ($Version -match $pattern) {
            Write-Host "❌ VIOLATION in $Source" -ForegroundColor Red
            Write-Host "   Pattern: $pattern" -ForegroundColor Red
            Write-Host "   Reason: $($forbiddenPatterns[$pattern])" -ForegroundColor Red
            Write-Host "   Current: $Version" -ForegroundColor Red
            Write-Host "   Required: v1.x.x format (e.g., v1.17.1)" -ForegroundColor Red
            return $false
        }
    }

    # Check for allowed format
    if ($Version -match $allowedPattern) {
        if ($Verbose) {
            Write-Host "✅ Valid: $Version" -ForegroundColor Green
        }
        return $true
    }

    Write-Host "❌ INVALID in $Source" -ForegroundColor Red
    Write-Host "   Current: $Version" -ForegroundColor Red
    Write-Host "   Required: v1.x.x format (e.g., v1.17.1)" -ForegroundColor Red
    return $false
}

# Main validation
$repoRoot = Split-Path -Parent $PSScriptRoot
$versionFile = Join-Path $repoRoot "VERSION"

if (-not (Test-Path $versionFile)) {
    Write-Host "❌ VERSION file not found at: $versionFile" -ForegroundColor Red
    exit 1
}

$version = (Get-Content $versionFile).Trim()

Write-Host "Validating version format..." -ForegroundColor Cyan
Write-Host "Source: $versionFile" -ForegroundColor Cyan
Write-Host "Current: $version" -ForegroundColor Cyan

if (Test-VersionFormat -Version $version -Source "VERSION file") {
    Write-Host "`n✅ Version format compliance: PASS" -ForegroundColor Green

    if ($CheckAll) {
        Write-Host "`nChecking all documentation files for version violations..." -ForegroundColor Cyan

        $violationFiles = @()

        # Check release notes
        Get-ChildItem -Path (Join-Path $repoRoot "docs/releases") -Filter "*.md" -ErrorAction SilentlyContinue | ForEach-Object {
            $content = Get-Content $_.FullName -Raw
            foreach ($pattern in $forbiddenPatterns.Keys) {
                if ($content -match $pattern) {
                    $violationFiles += $_.FullName
                    Write-Host "❌ Found violation in: $($_.Name)" -ForegroundColor Red
                }
            }
        }

        if ($violationFiles.Count -eq 0) {
            Write-Host "✅ No violations found in documentation" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Found $($violationFiles.Count) file(s) with version violations" -ForegroundColor Red
            exit 1
        }
    }

    exit 0
} else {
    Write-Host "`n❌ Version format compliance: FAIL" -ForegroundColor Red
    exit 1
}
