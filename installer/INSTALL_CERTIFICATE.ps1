#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs the AUT MIEEK code signing certificate to trust the SMS Installer.

.DESCRIPTION
    This script installs the public certificate to the Root and TrustedPublisher
    certificate stores, which allows the SMS Installer to show "AUT MIEEK" as 
    the verified publisher without security warnings.

    Must be run as Administrator.

.EXAMPLE
    .\INSTALL_CERTIFICATE.ps1
    Installs the certificate to trusted stores.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertPath = Join-Path $ScriptDir "AUT_MIEEK_CodeSign.cer"

if (-not (Test-Path $CertPath)) {
    Write-Error "Certificate not found: $CertPath"
    exit 1
}

Write-Host "`n=== Installing AUT MIEEK Code Signing Certificate ===" -ForegroundColor Green
Write-Host "Certificate: $CertPath`n"

# Add to Root store (for self-signed certificate chain validation)
Write-Host "Adding to Root certificate store..." -ForegroundColor Cyan
$result1 = certutil -addstore Root $CertPath 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Added to Root store" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Already exists or error: $result1" -ForegroundColor Yellow
}

# Add to TrustedPublisher store (for code signing trust)
Write-Host "Adding to TrustedPublisher certificate store..." -ForegroundColor Cyan
$result2 = certutil -addstore TrustedPublisher $CertPath 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Added to TrustedPublisher store" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Already exists or error: $result2" -ForegroundColor Yellow
}

Write-Host "`n✅ Certificate installation complete!" -ForegroundColor Green
Write-Host "   The SMS Installer will now show 'AUT MIEEK' as verified publisher." -ForegroundColor Cyan
Write-Host ""
