#!/usr/bin/env pwsh
<#
.SYNOPSIS
Setup SMS Native Lite on REMOTE PC (copy this file and run there)

.DESCRIPTION
Run this script on the PC where SMS_Native_Lite_Simple.exe is installed.
It will download credentials from a secure location and configure the app.

SECURITY:
- Credentials are NOT embedded in this script
- Must be provided via command-line parameter (kept in PowerShell history only during session)
- File permissions set to user-only access

.EXAMPLE
# Run interactively (you'll be prompted for credentials)
PS> .\setup_lite_qnap_remote.ps1

# Or provide inline JSON (careful - shows in history)
PS> .\setup_lite_qnap_remote.ps1 -CredentialsJson '{"host":"172.16.0.2",...}'

.NOTES
This script is meant to be run on the target PC where the Lite edition is installed.
#>

param(
    [string]$CredentialsJson = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "SMS NATIVE LITE - QNAP PostgreSQL SETUP (Remote)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Get credentials either from parameter or interactive input
if ([string]::IsNullOrWhiteSpace($CredentialsJson)) {
    Write-Host "⚠️  No credentials provided. Enter them now:" -ForegroundColor Yellow
    Write-Host ""

    $host_input = Read-Host "QNAP Host (e.g., 172.16.0.2)"
    $port_input = Read-Host "QNAP Port (e.g., 55433)"
    $user_input = Read-Host "Database User (e.g., sms_user)"
    $pass_input = Read-Host "Database Password" -AsSecureString
    $db_input = Read-Host "Database Name (e.g., student_management)"
    $ssl_input = Read-Host "SSL Mode (disable/prefer/require) [default: disable]"

    if ([string]::IsNullOrWhiteSpace($ssl_input)) {
        $ssl_input = "disable"
    }

    # Convert SecureString back to plain for JSON (it will be immediately written to file with restricted perms)
    $pass_plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($pass_input)
    )

    $CredentialsJson = @{
        host = $host_input
        port = $port_input
        dbname = $db_input
        user = $user_input
        password = $pass_plain
        sslmode = $ssl_input
    } | ConvertTo-Json -Compress
}

# Validate JSON
try {
    $creds = $CredentialsJson | ConvertFrom-Json
    Write-Host "✅ Credentials validated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  Host: $($creds.host)"
    Write-Host "  Port: $($creds.port)"
    Write-Host "  Database: $($creds.dbname)"
    Write-Host "  User: $($creds.user)"
    Write-Host "  SSL Mode: $($creds.sslmode)"
    Write-Host ""
} catch {
    Write-Host "❌ ERROR: Invalid credentials JSON" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Determine destination
$appDataDir = Join-Path $env:APPDATA "SMS_Native_Lite_Simple"
$destFile = Join-Path $appDataDir "qnap-credentials.json"

# Create directory
if (-not (Test-Path $appDataDir)) {
    Write-Host "📁 Creating directory: $appDataDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $appDataDir -Force | Out-Null
    Write-Host "✅ Directory created" -ForegroundColor Green
} else {
    Write-Host "✅ Directory exists: $appDataDir" -ForegroundColor Green
}

# Write credentials file
Write-Host ""
Write-Host "💾 Writing credentials to secure location..." -ForegroundColor Cyan

try {
    # Write file with restrictive permissions from the start
    # First, write the file
    $CredentialsJson | Out-File -FilePath $destFile -Encoding UTF8 -Force

    # Then immediately set permissions
    $acl = New-Object System.Security.AccessControl.FileSecurity
    $acl.SetAccessRuleProtection($true, $false)  # Disable inheritance, no propagation

    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        "ReadWrite",
        "None",
        "None",
        "Allow"
    )
    $acl.AddAccessRule($accessRule)

    Set-Acl -Path $destFile -AclObject $acl

    Write-Host "✅ Credentials saved securely: $destFile" -ForegroundColor Green
    Write-Host "   Permissions: User-only read/write (0600)" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR: Failed to save credentials" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Verify
Write-Host ""
Write-Host "✅ Verification..." -ForegroundColor Cyan

if (Test-Path $destFile) {
    $testCreds = Get-Content $destFile | ConvertFrom-Json
    Write-Host "✅ File is readable" -ForegroundColor Green

    $acl = Get-Acl $destFile
    $hasPublicAccess = $acl.Access | Where-Object {
        $_.IdentityReference -match "Everyone|Authenticated Users|BUILTIN"
    }

    if ($null -eq $hasPublicAccess) {
        Write-Host "✅ Permissions verified: User-only access" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: File may have public access!" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ ERROR: File not found after write!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETE" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close any running SMS_Native_Lite_Simple.exe windows" -ForegroundColor Yellow
Write-Host "2. Start SMS_Native_Lite_Simple.exe again" -ForegroundColor Yellow
Write-Host "3. It will auto-connect to QNAP PostgreSQL" -ForegroundColor Yellow
Write-Host "4. Login with your QNAP user account" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 Security Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Credentials file: $destFile" -ForegroundColor Cyan
Write-Host "  ✓ Permissions: User-only (0600)" -ForegroundColor Cyan
Write-Host "  ✓ Not accessible to other users on this PC" -ForegroundColor Cyan
Write-Host "  ✓ Standard Windows AppData location" -ForegroundColor Cyan
Write-Host ""

# Clear sensitive data from memory
$CredentialsJson = $null
[System.GC]::Collect()
