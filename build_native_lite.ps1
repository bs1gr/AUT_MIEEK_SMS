#!/usr/bin/env pwsh
<#
.SYNOPSIS
Build SMS_Native_Lite.exe for Week 1 (proof-of-concept)

.DESCRIPTION
1. Build React frontend to dist_lite/ with lite vite config
2. Bundle with PyInstaller
3. Copy to installer/dist/

.EXAMPLE
.\build_native_lite.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host "=== SMS Native Lite Build ===" -ForegroundColor Cyan

# Step 1: Build React frontend with lite config
Write-Host "Building frontend (dist_lite/)..." -ForegroundColor Yellow
npm --prefix frontend run build -- --config vite.config.lite.ts
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed"
    exit 1
}

# Step 2: Build with PyInstaller
Write-Host "Building executable with PyInstaller..." -ForegroundColor Yellow
$specPath = Join-Path (Get-Location) 'backend' 'lite_entrypoint.spec'
pyinstaller $specPath --noconfirm --distpath ./dist --buildpath ./build_lite --workpath ./build_lite/work
if ($LASTEXITCODE -ne 0) {
    Write-Error "PyInstaller build failed"
    exit 1
}

# Step 3: Copy to installer dist
Write-Host "Copying to installer/dist/..." -ForegroundColor Yellow
$exePath = Join-Path (Get-Location) 'dist' 'SMS_Native_Lite.exe'
if (-not (Test-Path $exePath)) {
    Write-Error "Executable not found at $exePath"
    exit 1
}

$installerDist = Join-Path (Get-Location) 'installer' 'dist'
if (-not (Test-Path $installerDist)) {
    New-Item -ItemType Directory -Path $installerDist -Force | Out-Null
}

Copy-Item -Path $exePath -Destination (Join-Path $installerDist 'SMS_Native_Lite.exe') -Force

Write-Host "✓ Build complete: installer/dist/SMS_Native_Lite.exe" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: python backend/lite_entrypoint.py"
Write-Host "2. PyWebView window should open with React UI"
Write-Host "3. Check http://127.0.0.1:8765/health"
Write-Host "4. Check data/sms_lite.db was created"
