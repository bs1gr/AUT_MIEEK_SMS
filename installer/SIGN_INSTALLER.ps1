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
    [string]$InstallerPath,
    [string]$CertPath,
    [string]$CertPassword,
    [string]$Thumbprint,
    [string]$SubjectMatch,
    [switch]$UseStore
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Certificate settings (can be overridden via parameters or environment variables)
$DefaultCertPath = Join-Path $ScriptDir "AUT_MIEEK_CodeSign.pfx"
$TimestampServer = "http://timestamp.digicert.com"

# Prefer secure env variables provided by CI secrets
if (-not $CertPath -and $env:SMS_CODESIGN_PFX_PATH) {
    $CertPath = $env:SMS_CODESIGN_PFX_PATH
}

if (-not $CertPassword -and $env:SMS_CODESIGN_PFX_PASSWORD) {
    $CertPassword = $env:SMS_CODESIGN_PFX_PASSWORD
}

# Fall back to bundled certificate path for local/offline scenarios
if (-not $CertPath) {
    $CertPath = $DefaultCertPath
}

# Find installer if not specified
if (-not $InstallerPath) {
    $DistDir = Join-Path $ProjectRoot "dist"
    $Installers = @(Get-ChildItem -Path $DistDir -Filter "SMS_Installer_*.exe" | Sort-Object LastWriteTime -Descending)
    if ($Installers.Count -eq 0) {
        Write-Error "No installer found in $DistDir. Build the installer first."
        exit 1
    }
    $InstallerPath = $Installers[0].FullName
    Write-Host "Found installer: $InstallerPath" -ForegroundColor Cyan
}

# Verify installer path early
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
Write-Host "SignTool: $SignTool"

# Determine signing method: Prefer store-based if requested or if Thumbprint/SubjectMatch provided
$usedMethod = $null
if ($UseStore -or $Thumbprint -or $SubjectMatch) {
    # Enumerate store
    $storeCerts = @()
    try { $storeCerts += Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue } catch {}
    try { $storeCerts += Get-ChildItem Cert:\LocalMachine\My -ErrorAction SilentlyContinue } catch {}

    # Filter to code-signing capable certs when EKU is present
    $codeSigning = @()
    foreach ($c in $storeCerts) {
        $added = $false
        try {
            $eku = $c.EnhancedKeyUsageList
            if ($eku) {
                $ekuNames = @($eku | ForEach-Object { $_.FriendlyName })
                $ekuOids = @($eku | ForEach-Object { $_.ObjectId.Value })
                if ($ekuNames -contains 'Code Signing' -or $ekuOids -contains '1.3.6.1.5.5.7.3.3') {
                    $codeSigning += $c
                    $added = $true
                }
            }
        } catch {
            # Some certs may not expose EKU via this property
            $codeSigning += $c
            $added = $true
        }
        if (-not $added) { continue }
    }

    $selected = $null
    if ($Thumbprint) {
        $clean = ($Thumbprint -replace '\s','').ToUpperInvariant()
        $selected = $codeSigning | Where-Object { $_.Thumbprint.ToUpperInvariant() -eq $clean } | Select-Object -First 1
        if (-not $selected) {
            Write-Error "Required certificate with thumbprint $Thumbprint not found in store. Ensure the AUT MIEEK (Limassol, CY) certificate is installed."
            exit 1
        }
    }
    elseif ($SubjectMatch) {
        $selected = $codeSigning | Where-Object { $_.Subject -match $SubjectMatch } | Sort-Object NotAfter -Descending | Select-Object -First 1
        if (-not $selected) {
            Write-Error "No certificate matching subject pattern '$SubjectMatch' found in store."
            exit 1
        }
    }
    else {
        # Require explicit thumbprint or subject match when using store signing
        Write-Error "Store-based signing requires -Thumbprint or -SubjectMatch parameter. No automatic cert selection."
        exit 1
    }

    if ($selected) {
        Write-Host "Using store certificate:" -ForegroundColor Cyan
        $selected | Select-Object Subject, Thumbprint, NotAfter | Format-List | Out-String | Write-Host
        $tp = ($selected.Thumbprint -replace '\s','')
        & $SignTool sign /fd SHA256 /tr $TimestampServer /td SHA256 /sha1 $tp $InstallerPath
        $usedMethod = "store:$tp"
    } else {
        Write-Host "No matching certificate found in store; will fall back to PFX if available." -ForegroundColor Yellow
    }
}

if (-not $usedMethod) {
    # PFX path method
    if (-not (Test-Path $CertPath)) {
        Write-Error "Certificate not found: $CertPath. Provide -CertPath or set SMS_CODESIGN_PFX_PATH, or use -UseStore/Thumbprint."
        exit 1
    }
    if (-not $CertPassword) {
        Write-Error "Certificate password not provided. Set SMS_CODESIGN_PFX_PASSWORD or pass -CertPassword, or use -UseStore/Thumbprint."
        exit 1
    }
    Write-Host "Certificate: $CertPath"
    & $SignTool sign /f $CertPath /p $CertPassword /fd SHA256 /tr $TimestampServer /td SHA256 /d "Student Management System" $InstallerPath
    $usedMethod = "pfx:$CertPath"
}

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
    Write-Host "   Publisher: $($Signature.SignerCertificate.Subject)" -ForegroundColor Cyan
    Write-Host "   Method: $usedMethod" -ForegroundColor DarkCyan
} else {
    Write-Error "Signature verification failed: $($Signature.StatusMessage)"
    exit 1
}
