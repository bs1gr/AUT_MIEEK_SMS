# Frontend Diagnostic Script
# Helps troubleshoot frontend startup issues

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Frontend Diagnostic Tool" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "[1/7] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Node.js: $nodeVersion" -ForegroundColor Green

        # Extract version number and check if it's >= 18
        $versionString = $nodeVersion.ToString().TrimStart('v')
        $versionParts = $versionString -split '\.'
        $majorVersion = [int]$versionParts[0]

        if ($majorVersion -lt 18) {
            Write-Host "  X WARNING: Node.js version is too old for Vite 5.x!" -ForegroundColor Red
            Write-Host "    Current: $nodeVersion | Required: v18.0.0+" -ForegroundColor Yellow
            Write-Host "    This will cause: 'crypto.getRandomValues is not a function'" -ForegroundColor Gray
            Write-Host "    >> Download Node.js 18 LTS from https://nodejs.org/" -ForegroundColor Yellow
        } else {
            Write-Host "  OK Version is compatible with Vite 5.x (requires 18+)" -ForegroundColor Green
        }
    } else {
        Write-Host "  X Node.js not found or not working" -ForegroundColor Red
        Write-Host "    >> Download from https://nodejs.org/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  X Node.js not found!" -ForegroundColor Red
    Write-Host "    >> Download from https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/7] Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK npm: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  X npm not found or not working" -ForegroundColor Red
    }
} catch {
    Write-Host "  X npm not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/7] Checking frontend directory..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Write-Host "  OK frontend directory exists" -ForegroundColor Green
} else {
    Write-Host "  X frontend directory NOT found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/7] Checking package.json..." -ForegroundColor Yellow
if (Test-Path "frontend\package.json") {
    Write-Host "  OK package.json exists" -ForegroundColor Green

    # Read and display scripts
    try {
        $packageJson = Get-Content "frontend\package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.dev) {
            Write-Host "  OK 'dev' script found: $($packageJson.scripts.dev)" -ForegroundColor Green
        } else {
            Write-Host "  X 'dev' script NOT found in package.json!" -ForegroundColor Red
        }
    } catch {
        Write-Host "  X Could not read package.json!" -ForegroundColor Red
    }
} else {
    Write-Host "  X package.json NOT found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "[5/7] Checking node_modules..." -ForegroundColor Yellow
if (Test-Path "frontend\node_modules") {
    $moduleCount = (Get-ChildItem "frontend\node_modules" -Directory -ErrorAction SilentlyContinue).Count
    if ($moduleCount -gt 0) {
        Write-Host "  OK node_modules exists with $moduleCount packages" -ForegroundColor Green
    } else {
        Write-Host "  X node_modules exists but is empty!" -ForegroundColor Red
    }
} else {
    Write-Host "  X node_modules NOT found!" -ForegroundColor Red
    Write-Host "  >> Run: cd frontend && npm install" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/7] Checking critical dependencies..." -ForegroundColor Yellow
$criticalDeps = @("vite", "react", "react-dom")
$missingDeps = @()

foreach ($dep in $criticalDeps) {
    if (Test-Path "frontend\node_modules\$dep") {
        Write-Host "  OK $dep installed" -ForegroundColor Green
    } else {
        Write-Host "  X $dep NOT installed" -ForegroundColor Red
        $missingDeps += $dep
    }
}

Write-Host ""
Write-Host "[7/7] Checking port availability..." -ForegroundColor Yellow
$port5173 = netstat -ano | Select-String ":5173.*LISTENING"
if ($port5173) {
    Write-Host "  ! Port 5173 is already in use" -ForegroundColor Yellow
    foreach ($line in $port5173) {
        if ($line -match "\s+(\d+)$") {
            $processId = $Matches[1]
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "    PID $processId - $($proc.ProcessName)" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "  OK Port 5173 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($missingDeps.Count -gt 0) {
    Write-Host "ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "  Missing dependencies detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Run these commands:" -ForegroundColor Yellow
    Write-Host "  1. cd frontend" -ForegroundColor White
    Write-Host "  2. npm install" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Environment looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If frontend still won't start, try:" -ForegroundColor Yellow
    Write-Host "  1. cd frontend" -ForegroundColor White
    Write-Host "  2. npm run dev" -ForegroundColor White
    Write-Host "  3. Check for error messages" -ForegroundColor White
    Write-Host ""
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
