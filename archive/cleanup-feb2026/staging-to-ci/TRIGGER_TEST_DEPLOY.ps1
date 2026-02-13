<#
.SYNOPSIS
    Trigger test deployment after runner reconfiguration.

.DESCRIPTION
    Creates an empty commit and pushes to trigger the CI/CD pipeline.
    Use this after running RUN_ON_REC_HOST.ps1 on the REC host.

.EXAMPLE
    .\TRIGGER_TEST_DEPLOY.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Trigger Test Deployment - Development Machine" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "▶ Checking git status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "⚠ Warning: You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "▶ Creating test commit..." -ForegroundColor Yellow
git commit --allow-empty -m "test: verify runner Docker access after reconfiguration"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to create commit" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Test commit created" -ForegroundColor Green
Write-Host ""

Write-Host "▶ Pushing to trigger pipeline..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to push" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Pipeline triggered" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Monitoring Pipeline Run" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Waiting for run to appear..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Latest run status:" -ForegroundColor White
gh run list --workflow ci-cd-pipeline.yml --limit 1

Write-Host ""
Write-Host "To watch in real-time:" -ForegroundColor Yellow
Write-Host "  gh run watch" -ForegroundColor White
Write-Host ""
Write-Host "To view in browser:" -ForegroundColor Yellow
Write-Host "  gh run view --web" -ForegroundColor White
Write-Host ""

# Auto-watch
$watch = Read-Host "Start watching now? (y/n)"
if ($watch -eq 'y') {
    gh run watch
}