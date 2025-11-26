#Requires -Version 5.1
<#
.SYNOPSIS
    Signs the SMS Installer executable with the AUT MIEEK code signing certificate.

.DESCRIPTION
    This script signs the installer executable using the self-signed code signing
    certificate. The signed installer will show "AUT MIEEK" as the verified publisher.

.PARAMETER InstallerPath
    Path to the installer executable to sign. Defaults to the latest in dist folder.

.EXAMPLE
    .\SIGN_INSTALLER.ps1
    Signs the default installer in dist folder.

.EXAMPLE
    .\SIGN_INSTALLER.ps1 -InstallerPath "dist\SMS_Installer_2.0.0.exe"
    Signs a specific installer file.
#>

param(
    [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Certificate settings
$CertPath = Join-Path $ScriptDir "AUT_MIEEK_CodeSign.pfx"
$CertPassword = "SMSCodeSign2025!"
$TimestampServer = "http://timestamp.digicert.com"

# Find installer if not specified
if (-not $InstallerPath) {
    $DistDir = Join-Path $ProjectRoot "dist"
    $Installers = Get-ChildItem -Path $DistDir -Filter "SMS_Installer_*.exe" | Sort-Object LastWriteTime -Descending
    if ($Installers.Count -eq 0) {
        Write-Error "No installer found in $DistDir. Build the installer first."
        exit 1
    }
    $InstallerPath = $Installers[0].FullName
    Write-Host "Found installer: $InstallerPath" -ForegroundColor Cyan
}

# Verify paths
if (-not (Test-Path $CertPath)) {
    Write-Error "Certificate not found: $CertPath"
    exit 1
}

if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found: $InstallerPath"
    exit 1
}

# Find signtool
$SignTool = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like "*x64*" } |
    Sort-Object { [version]($_.DirectoryName -replace '.*\\(\d+\.\d+\.\d+\.\d+)\\.*', '$1') } -Descending |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $SignTool) {
    Write-Error "SignTool not found. Please install Windows SDK."
    exit 1
}

Write-Host "`n=== Signing Installer ===" -ForegroundColor Green
Write-Host "Installer: $InstallerPath"
Write-Host "Certificate: $CertPath"
Write-Host "SignTool: $SignTool"
Write-Host ""

# Sign the installer
& $SignTool sign /f $CertPath /p $CertPassword /fd SHA256 /tr $TimestampServer /td SHA256 /d "Student Management System" $InstallerPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Signing failed with exit code $LASTEXITCODE"
    exit 1
}

# Verify signature
Write-Host "`n=== Verifying Signature ===" -ForegroundColor Green
$Signature = Get-AuthenticodeSignature $InstallerPath
Write-Host "Status: $($Signature.Status)"
Write-Host "Signer: $($Signature.SignerCertificate.Subject)"

if ($Signature.Status -eq "Valid") {
    Write-Host "`n✅ Installer signed successfully!" -ForegroundColor Green
    Write-Host "   Publisher will show as: AUT MIEEK" -ForegroundColor Cyan
} else {
    Write-Error "Signature verification failed: $($Signature.StatusMessage)"
    exit 1
}
