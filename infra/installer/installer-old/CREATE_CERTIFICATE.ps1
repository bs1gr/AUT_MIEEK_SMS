#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates a new AUT MIEEK code signing certificate with correct location information.
    Δημιουργεί νέο πιστοποιητικό υπογραφής κώδικα για το AUT MIEEK με σωστές πληροφορίες τοποθεσίας.

.DESCRIPTION
    Generates a self-signed code signing certificate for an application built for:
    ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης
    Website: https://www.mieek.ac.cy/index.php/el/

    This certificate is for a Student Management System developed by a teacher at ΜΙΕΕΚ.

    Certificate Details / Λεπτομέρειες Πιστοποιητικού:
    - Common Name (CN): AUT MIEEK
    - Organization (O): AUT MIEEK
    - Locality (L): Limassol / Λεμεσός
    - Country (C): Cyprus / Κύπρος (CY)

    Valid for 3 years from creation date.
    Ισχύει για 3 χρόνια από την ημερομηνία δημιουργίας.

.PARAMETER Language
    Interface language: 'en' for English, 'el' for Greek (Ελληνικά)
    Default: Auto-detect from system or config\lang.txt

.EXAMPLE
    .\CREATE_CERTIFICATE.ps1
    Creates new certificate and exports to .pfx and .cer files.

.EXAMPLE
    .\CREATE_CERTIFICATE.ps1 -Language el
    Δημιουργεί νέο πιστοποιητικό με ελληνική διεπαφή.
#>

param(
    [ValidateSet('en', 'el')]
    [string]$Language = ''
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Auto-detect language if not specified
if (-not $Language) {
    $LangFile = Join-Path $ScriptDir "config\lang.txt"
    if (Test-Path $LangFile) {
        $Language = (Get-Content $LangFile -Raw).Trim()
    } else {
        $Language = 'en'  # Default to English
    }
}

# Bilingual messages
$Messages = @{
    en = @{
        Title = "AUT MIEEK Code Signing Certificate Generator"
        OrgName = "ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης"
        Details = "Certificate Details:"
        Subject = "Subject:"
        ValidFor = "Valid For:"
        Type = "Type:"
        CodeSigning = "Code Signing"
        Years = "years"
        BackingUp = "Backing up existing certificate to:"
        Creating = "Creating new self-signed certificate..."
        Created = "Certificate created in certificate store"
        Thumbprint = "Thumbprint:"
        ExportingPfx = "Exporting to PFX (with private key)..."
        ExportingCer = "Exporting to CER (public key only)..."
        Exported = "Exported:"
        Success = "Certificate Created Successfully"
        CertInfo = "Certificate Information:"
        Issuer = "Issuer:"
        ValidFrom = "Valid From:"
        ValidUntil = "Valid Until:"
        FilesCreated = "Files Created:"
        PrivateKey = "private key, password:"
        PublicKey = "public key"
        NextSteps = "Next Steps:"
        InstallCert = "Install certificate to trust stores:"
        ReSign = "Re-sign the installer:"
        Verify = "Verify the signature:"
        Location = "Location: Limassol, Cyprus"
        Website = "Website: https://www.mieek.ac.cy/index.php/el/"
    }
    el = @{
        Title = "Δημιουργία Πιστοποιητικού Υπογραφής Κώδικα AUT MIEEK"
        OrgName = "ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης"
        Details = "Λεπτομέρειες Πιστοποιητικού:"
        Subject = "Θέμα:"
        ValidFor = "Ισχύει για:"
        Type = "Τύπος:"
        CodeSigning = "Υπογραφή Κώδικα"
        Years = "χρόνια"
        BackingUp = "Δημιουργία αντιγράφου ασφαλείας υπάρχοντος πιστοποιητικού:"
        Creating = "Δημιουργία νέου αυτο-υπογεγραμμένου πιστοποιητικού..."
        Created = "Το πιστοποιητικό δημιουργήθηκε στο χώρο αποθήκευσης"
        Thumbprint = "Αποτύπωμα:"
        ExportingPfx = "Εξαγωγή σε PFX (με ιδιωτικό κλειδί)..."
        ExportingCer = "Εξαγωγή σε CER (μόνο δημόσιο κλειδί)..."
        Exported = "Εξήχθη:"
        Success = "Το Πιστοποιητικό Δημιουργήθηκε Επιτυχώς"
        CertInfo = "Πληροφορίες Πιστοποιητικού:"
        Issuer = "Εκδότης:"
        ValidFrom = "Ισχύει από:"
        ValidUntil = "Ισχύει μέχρι:"
        FilesCreated = "Αρχεία που Δημιουργήθηκαν:"
        PrivateKey = "ιδιωτικό κλειδί, κωδικός:"
        PublicKey = "δημόσιο κλειδί"
        NextSteps = "Επόμενα Βήματα:"
        InstallCert = "Εγκαταστήστε το πιστοποιητικό στους χώρους αξιοπιστίας:"
        ReSign = "Επανυπογράψτε το πρόγραμμα εγκατάστασης:"
        Verify = "Επαληθεύστε την υπογραφή:"
        Location = "Τοποθεσία: Λεμεσός, Κύπρος"
        Website = "Ιστοσελίδα: https://www.mieek.ac.cy/index.php/el/"
    }
}

$Msg = $Messages[$Language]

# Certificate configuration
$CertSubject = "CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY"
$CertPassword = "SMSCodeSign2025!"
$PfxPath = Join-Path $ScriptDir "AUT_MIEEK_CodeSign.pfx"
$CerPath = Join-Path $ScriptDir "AUT_MIEEK_CodeSign.cer"
$ValidYears = 3

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  $($Msg.Title.PadRight(57)) ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host $Msg.OrgName -ForegroundColor Magenta
Write-Host $Msg.Location -ForegroundColor Gray
Write-Host $Msg.Website -ForegroundColor Gray
Write-Host ""

Write-Host "$($Msg.Details)" -ForegroundColor Green
Write-Host "  $($Msg.Subject)    $CertSubject" -ForegroundColor White
Write-Host "  $($Msg.ValidFor)  $ValidYears $($Msg.Years)" -ForegroundColor White
Write-Host "  $($Msg.Type)       $($Msg.CodeSigning)" -ForegroundColor White
Write-Host ""

# Backup existing certificates if they exist
if (Test-Path $PfxPath) {
    $BackupPath = "$PfxPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "⚠️  $($Msg.BackingUp)" -ForegroundColor Yellow
    Write-Host "   $BackupPath" -ForegroundColor Gray
    Copy-Item $PfxPath $BackupPath
}

if (Test-Path $CerPath) {
    $BackupPath = "$CerPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $CerPath $BackupPath
}

Write-Host $Msg.Creating -ForegroundColor Cyan

# Create the certificate
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $CertSubject `
    -KeyUsage DigitalSignature `
    -FriendlyName "AUT MIEEK Code Signing Certificate" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears($ValidYears) `
    -HashAlgorithm SHA256

if (-not $cert) {
    Write-Error "Failed to create certificate"
    exit 1
}

Write-Host "  ✅ $($Msg.Created)" -ForegroundColor Green
Write-Host "     $($Msg.Thumbprint) $($cert.Thumbprint)" -ForegroundColor Gray

# Export to PFX (with private key)
Write-Host "`n$($Msg.ExportingPfx)" -ForegroundColor Cyan
$SecurePassword = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $SecurePassword | Out-Null
Write-Host "  ✅ $($Msg.Exported) $PfxPath" -ForegroundColor Green

# Export to CER (public key only)
Write-Host "$($Msg.ExportingCer)" -ForegroundColor Cyan
Export-Certificate -Cert $cert -FilePath $CerPath | Out-Null
Write-Host "  ✅ $($Msg.Exported) $CerPath" -ForegroundColor Green

# Display certificate information
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  $($Msg.Success.PadRight(57)) ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "$($Msg.CertInfo)" -ForegroundColor Cyan
Write-Host "  $($Msg.Subject)      $($cert.Subject)" -ForegroundColor White
Write-Host "  $($Msg.Issuer)       $($cert.Issuer)" -ForegroundColor White
Write-Host "  $($Msg.Thumbprint)   $($cert.Thumbprint)" -ForegroundColor White
Write-Host "  $($Msg.ValidFrom)   $($cert.NotBefore)" -ForegroundColor White
Write-Host "  $($Msg.ValidUntil)  $($cert.NotAfter)" -ForegroundColor White

Write-Host "`n$($Msg.FilesCreated)" -ForegroundColor Cyan
Write-Host "  • $PfxPath ($($Msg.PrivateKey) $CertPassword)" -ForegroundColor White
Write-Host "  • $CerPath ($($Msg.PublicKey))" -ForegroundColor White

Write-Host "`n$($Msg.NextSteps)" -ForegroundColor Yellow
Write-Host "  1. $($Msg.InstallCert)" -ForegroundColor White
Write-Host "     .\INSTALL_CERTIFICATE.ps1" -ForegroundColor Cyan
Write-Host "  2. $($Msg.ReSign)" -ForegroundColor White
Write-Host "     .\SIGN_INSTALLER.ps1 -InstallerPath ..\dist\SMS_Installer_1.9.4.exe" -ForegroundColor Cyan
Write-Host "  3. $($Msg.Verify)" -ForegroundColor White
Write-Host "     Get-AuthenticodeSignature ..\dist\SMS_Installer_1.9.4.exe" -ForegroundColor Cyan
Write-Host ""

# Clean up from certificate store (optional - keeping it there is fine)
# Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
