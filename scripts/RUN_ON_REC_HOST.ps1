<#
.SYNOPSIS
    Quick execution script for REC host runner reconfiguration.

.DESCRIPTION
    This script bundles all the commands needed to reconfigure the runner on REC host.
    Copy this file to REC host and run as Administrator.

.EXAMPLE
    Run on REC host (172.16.0.17) as Administrator:
    .\RUN_ON_REC_HOST.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "GitHub Actions Runner Reconfiguration - REC Host" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Verify Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Navigate to repository
$repoPath = "D:\SMS\student-management-system"
if (-not (Test-Path $repoPath)) {
    Write-Host "❌ ERROR: Repository not found at $repoPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Repository found" -ForegroundColor Green
cd $repoPath

# Pull latest changes
Write-Host ""
Write-Host "▶ Pulling latest code..." -ForegroundColor Yellow
git pull origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Git pull had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 1: Preview Changes (DRY RUN)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

cd scripts
.\RECONFIGURE_RUNNER_USER_MODE.ps1 -DryRun

Write-Host ""
$continue = Read-Host "Continue with actual reconfiguration? (y/n)"
if ($continue -ne 'y') {
    Write-Host "Cancelled by user" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 2: Execute Reconfiguration" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

.\RECONFIGURE_RUNNER_USER_MODE.ps1 -Force

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 3: Verify Docker Access" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

.\VERIFY_RUNNER_DOCKER_ACCESS.ps1

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ EXECUTION COMPLETE" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Trigger a test pipeline run from development machine" -ForegroundColor Yellow
Write-Host "Expected: Deploy to Staging job should now succeed" -ForegroundColor White
Write-Host ""
