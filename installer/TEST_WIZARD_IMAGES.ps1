#!/usr/bin/env powershell
# Quick test of wizard image generation

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Testing Wizard Image Generation..." -ForegroundColor Cyan

try {
    $scriptPath = Join-Path $PSScriptRoot "create_wizard_images.ps1"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "✗ Script not found: $scriptPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Running: $scriptPath -Force" -ForegroundColor Yellow
    & $scriptPath -Force
    
    Write-Host ""
    Write-Host "Checking generated images..." -ForegroundColor Yellow
    
    $largeImage = Join-Path $PSScriptRoot "wizard_image.bmp"
    $smallImage = Join-Path $PSScriptRoot "wizard_small.bmp"
    
    if (Test-Path $largeImage) {
        $size = (Get-Item $largeImage).Length
        Write-Host "✓ Large image created: wizard_image.bmp ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "✗ Large image NOT created" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path $smallImage) {
        $size = (Get-Item $smallImage).Length
        Write-Host "✓ Small image created: wizard_small.bmp ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "✗ Small image NOT created" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    exit 0
    
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    Write-Host "Stack: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}
