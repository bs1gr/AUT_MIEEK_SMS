#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automatic setup after extracting GitHub release ZIP
.DESCRIPTION
    Run this script after downloading and extracting the ZIP from:
    https://github.com/bs1gr/AUT_MIEEK_SMS/archive/refs/tags/v1.8.6.1.zip
    
    This script will:
    1. Check Docker availability
    2. Create backend/.env from .env.example
    3. Remove any old containers/volumes
    4. Start the application
#>

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Student Management System - Automatic Setup" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running from extracted GitHub ZIP
if (!(Test-Path "RUN.ps1")) {
    Write-Host "❌ Error: RUN.ps1 not found!" -ForegroundColor Red
    Write-Host "   Please run this script from the extracted ZIP folder." -ForegroundColor Yellow
    Write-Host "   Expected structure: AUT_MIEEK_SMS-1.8.6.1\" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found RUN.ps1" -ForegroundColor Green

# Step 1: Check Docker
Write-Host ""
Write-Host "📋 Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        docker info >$null 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ⚠️  Docker is not running!" -ForegroundColor Yellow
            Write-Host "   → Starting Docker Desktop..." -ForegroundColor Cyan
            Write-Host "   → Please wait 30-60 seconds for Docker to start..." -ForegroundColor Cyan
            
            # Try to start Docker Desktop
            $dockerDesktop = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
            if (!$dockerDesktop) {
                Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
            }
            
            # Wait for Docker to be ready
            $maxWait = 60
            $waited = 0
            while ($waited -lt $maxWait) {
                Start-Sleep -Seconds 3
                $waited += 3
                docker info >$null 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ Docker is now running!" -ForegroundColor Green
                    break
                }
                Write-Host "   ⏳ Waiting... ($waited seconds)" -ForegroundColor Gray
            }
            
            if ($waited -ge $maxWait) {
                Write-Host "   ❌ Docker failed to start within $maxWait seconds" -ForegroundColor Red
                Write-Host "   → Please start Docker Desktop manually and run this script again" -ForegroundColor Yellow
                exit 1
            }
        } else {
            Write-Host "   ✅ Docker is running" -ForegroundColor Green
        }
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "   ❌ Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "   https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Step 2: Create backend/.env
Write-Host ""
Write-Host "📋 Step 2: Creating configuration..." -ForegroundColor Yellow

if (!(Test-Path "backend")) {
    New-Item -ItemType Directory -Path "backend" -Force | Out-Null
    Write-Host "   ✅ Created backend folder" -ForegroundColor Green
}

if (!(Test-Path "backend\.env.example")) {
    Write-Host "   ❌ Error: backend\.env.example not found!" -ForegroundColor Red
    exit 1
}

if (Test-Path "backend\.env") {
    Write-Host "   ℹ️  backend\.env already exists, keeping it" -ForegroundColor Cyan
} else {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "   ✅ Created backend\.env from template" -ForegroundColor Green
}

# Verify admin credentials are configured
$envContent = Get-Content "backend\.env" -Raw
if ($envContent -match "AUTH_ENABLED=True" -and $envContent -match "DEFAULT_ADMIN_EMAIL=") {
    Write-Host "   ✅ Admin auto-bootstrap is configured" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Warning: Admin credentials may not be configured" -ForegroundColor Yellow
}

# Step 3: Clean old installations
Write-Host ""
Write-Host "📋 Step 3: Cleaning old installations..." -ForegroundColor Yellow

$oldContainer = docker ps -a --filter "name=sms-app" --format "{{.Names}}" 2>$null
if ($oldContainer) {
    Write-Host "   → Stopping old container..." -ForegroundColor Cyan
    docker stop sms-app 2>$null | Out-Null
    docker rm sms-app 2>$null | Out-Null
    Write-Host "   ✅ Removed old container" -ForegroundColor Green
}

$oldVolume = docker volume ls --filter "name=sms_data" --format "{{.Name}}" 2>$null
if ($oldVolume) {
    Write-Host "   → Removing old volume..." -ForegroundColor Cyan
    docker volume rm sms_data 2>$null | Out-Null
    Write-Host "   ✅ Removed old volume (fresh database will be created)" -ForegroundColor Green
}

# Step 4: Start application
Write-Host ""
Write-Host "📋 Step 4: Starting application..." -ForegroundColor Yellow
Write-Host "   → Running .\RUN.ps1..." -ForegroundColor Cyan
Write-Host ""

& ".\RUN.ps1"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application is running at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔐 Default Login Credentials:" -ForegroundColor Yellow
    Write-Host "   Email:    admin@example.com" -ForegroundColor White
    Write-Host "   Password: YourSecurePassword123!" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change password after first login!" -ForegroundColor Red
    Write-Host "   → Control Panel → Maintenance → Change Your Password" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📚 Commands:" -ForegroundColor Cyan
    Write-Host "   .\RUN.ps1         - Start application" -ForegroundColor White
    Write-Host "   .\RUN.ps1 -Stop   - Stop application" -ForegroundColor White
    Write-Host "   .\RUN.ps1 -Status - Check status" -ForegroundColor White
    Write-Host "   .\SMS.ps1         - Management menu" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Setup failed. Please check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Docker not running: Start Docker Desktop manually" -ForegroundColor White
    Write-Host "  - Port 8080 in use: netstat -ano | findstr :8080" -ForegroundColor White
    Write-Host "  - Check logs: docker logs sms-app" -ForegroundColor White
    Write-Host ""
    exit 1
}
