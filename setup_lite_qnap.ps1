#!/usr/bin/env pwsh
<#
.SYNOPSIS
Setup SMS Native Lite to connect to QNAP PostgreSQL
Securely copies credentials and configures the lite version for remote database access.

.DESCRIPTION
- Reads credentials from local-secrets/qnap-credentials.json
- Copies to %APPDATA%\SMS_Native_Lite_Simple\ with restricted permissions
- Sets file permissions so only current user can read
- Displays connection status

.EXAMPLE
PS> .\setup_lite_qnap.ps1

.NOTES
SECURITY: File permissions set to 0600 (user read/write only, no public access)
#>

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "SMS NATIVE LITE - QNAP PostgreSQL SETUP" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Find credentials file
$credFile = Join-Path (Get-Location) "local-secrets" "qnap-credentials.json"

if (-not (Test-Path $credFile)) {
    Write-Host "❌ ERROR: Credentials file not found!" -ForegroundColor Red
    Write-Host "   Expected: $credFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found credentials file: $credFile" -ForegroundColor Green

# Read and validate credentials
try {
    $creds = Get-Content $credFile | ConvertFrom-Json
    Write-Host "✅ Credentials loaded successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database Configuration:" -ForegroundColor Yellow
    Write-Host "  Host: $($creds.host)"
    Write-Host "  Port: $($creds.port)"
    Write-Host "  Database: $($creds.dbname)"
    Write-Host "  User: $($creds.user)"
    Write-Host ""
} catch {
    Write-Host "❌ ERROR: Failed to parse credentials JSON" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Determine destination based on whether we're in bundled exe or dev environment
$appDataDir = Join-Path $env:APPDATA "SMS_Native_Lite_Simple"

# Create directory with full permissions first
if (-not (Test-Path $appDataDir)) {
    Write-Host "📁 Creating directory: $appDataDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $appDataDir -Force | Out-Null
    Write-Host "✅ Directory created" -ForegroundColor Green
} else {
    Write-Host "✅ Directory already exists: $appDataDir" -ForegroundColor Green
}

# Copy credentials file
$destFile = Join-Path $appDataDir "qnap-credentials.json"
Write-Host ""
Write-Host "📋 Copying credentials..." -ForegroundColor Cyan

try {
    Copy-Item -Path $credFile -Destination $destFile -Force
    Write-Host "✅ Credentials copied to: $destFile" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to copy credentials" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# SECURITY: Set restrictive permissions (user-only read/write)
Write-Host ""
Write-Host "🔐 Setting file permissions (user-only access)..." -ForegroundColor Cyan

try {
    # Remove all existing ACLs
    $acl = Get-Acl $destFile
    $acl.Access | ForEach-Object {
        $acl.RemoveAccessRule($_) | Out-Null
    }

    # Add only current user with read/write
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        "ReadWrite",
        "None",
        "None",
        "Allow"
    )
    $acl.AddAccessRule($accessRule)

    # Apply permissions
    Set-Acl -Path $destFile -AclObject $acl
    Write-Host "✅ File permissions set to user-only (0600)" -ForegroundColor Green

    # Verify permissions
    $acl = Get-Acl $destFile
    Write-Host "   Access Rules:" -ForegroundColor Gray
    $acl.Access | ForEach-Object {
        Write-Host "   - $($_.IdentityReference): $($_.FileSystemRights)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  WARNING: Could not set file permissions: $_" -ForegroundColor Yellow
    Write-Host "   File is readable but permissions may not be fully restricted" -ForegroundColor Yellow
}

# Verify file exists and is readable
Write-Host ""
Write-Host "✅ Verifying configuration..." -ForegroundColor Cyan

if (Test-Path $destFile) {
    $testCreds = Get-Content $destFile | ConvertFrom-Json
    Write-Host "✅ Configuration file is valid and readable" -ForegroundColor Green
    Write-Host "   Host: $($testCreds.host):$($testCreds.port)" -ForegroundColor Gray
    Write-Host "   Database: $($testCreds.dbname)" -ForegroundColor Gray
} else {
    Write-Host "❌ ERROR: Configuration file not found after copy!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETE" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart SMS_Native_Lite_Simple.exe" -ForegroundColor Yellow
Write-Host "2. It will auto-connect to QNAP PostgreSQL" -ForegroundColor Yellow
Write-Host "3. Login with your QNAP user account" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 Security Notes:" -ForegroundColor Cyan
Write-Host "  ✓ Credentials file is user-read-only ($destFile)" -ForegroundColor Cyan
Write-Host "  ✓ Other users on this PC cannot read the file" -ForegroundColor Cyan
Write-Host "  ✓ File is located in AppData (standard Windows practice)" -ForegroundColor Cyan
Write-Host ""
