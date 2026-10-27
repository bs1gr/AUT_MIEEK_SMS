#Requires -Version 5.1
<#
.SYNOPSIS
    Signs the SMS installer, or any set of PE files, with the AUT MIEEK code signing certificate.

.DESCRIPTION
    Two modes:
      * Installer mode (default, no -Path): signs the newest SMS_Installer_*.exe in dist\ or the
        file given with -InstallerPath. Unchanged behaviour.
      * Path mode (-Path): signs every file given, and for each directory every *.exe, *.dll and
        *.pyd beneath it that carries no signature at all. Files already signed by someone else
        (Python's PSF-signed DLLs, Microsoft's CRT) are left alone: replacing their signature
        with ours gains nothing and loses their reputation. Files already signed with the
        selected certificate are skipped, so the script is idempotent — Inno Setup's SignTool
        directive and INSTALLER_BUILDER can both call it on the same file.

    Signing uses signtool with SHA-256 digest and an RFC 3161 timestamp. The certificate comes
    from the store (-UseStore with -Thumbprint or -SubjectMatch) or from a PFX (-CertPath /
    SMS_CODESIGN_PFX_PATH + SMS_CODESIGN_PFX_PASSWORD). After signing, every target must carry
    the selected certificate; the status may be Valid, or UnknownError on a machine that does
    not trust the certificate chain (CI runners with the self-signed AUT MIEEK certificate).

.PARAMETER Path
    Files and/or directories to sign (path mode). Directories are searched recursively.

.PARAMETER InstallerPath
    Installer executable to sign (installer mode). Defaults to the newest in dist\.

.EXAMPLE
    .\SIGN_INSTALLER.ps1 -UseStore -Thumbprint 2693C1B1... -Path dist\SMS_Lite, dist\SMS_Manager.exe
    Signs SMS_Lite.exe, every unsigned binary under _internal, and SMS_Manager.exe.

.EXAMPLE
    .\SIGN_INSTALLER.ps1
    Signs the default installer in dist folder.
#>

param(
    [string]$InstallerPath,
    [string[]]$Path,
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
$BatchSize = 25   # files per signtool invocation (keeps the command line short, one timestamp request per file regardless)

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

# CREATE_CERTIFICATE.ps1 writes the generated password to a gitignored file
# next to the .pfx (no password is ever hardcoded in a tracked script).
if (-not $CertPassword) {
    $DefaultPasswordPath = "$DefaultCertPath.password.txt"
    if (Test-Path $DefaultPasswordPath) {
        $CertPassword = (Get-Content $DefaultPasswordPath -Raw).Trim()
    }
}

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------
$pathMode = $Path -and $Path.Count -gt 0
$explicitTargets = [System.Collections.Generic.List[string]]::new()   # sign unless already ours
$discoveredTargets = [System.Collections.Generic.List[string]]::new() # sign only if unsigned

if ($pathMode) {
    foreach ($p in $Path) {
        if (-not (Test-Path $p)) {
            Write-Error "Path not found: $p"
            exit 1
        }
        $item = Get-Item $p
        if ($item.PSIsContainer) {
            Get-ChildItem -Path $item.FullName -Recurse -File -Include *.exe, *.dll, *.pyd |
                ForEach-Object { $discoveredTargets.Add($_.FullName) }
        } else {
            $explicitTargets.Add($item.FullName)
        }
    }
} else {
    # Installer mode: find installer if not specified
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
    if (-not (Test-Path $InstallerPath)) {
        Write-Error "Installer not found: $InstallerPath"
        exit 1
    }
    $explicitTargets.Add((Get-Item $InstallerPath).FullName)
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

Write-Host "`n=== Code Signing ===" -ForegroundColor Green
Write-Host "SignTool: $SignTool"

# ---------------------------------------------------------------------------
# Certificate selection → $signArgs (signtool arguments before the file list) + $expectedThumb
# ---------------------------------------------------------------------------
$signArgs = $null
$expectedThumb = $null
$usedMethod = $null

if ($UseStore -or $Thumbprint -or $SubjectMatch) {
    $storeCerts = @()
    try { $storeCerts += Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue } catch {}
    try { $storeCerts += Get-ChildItem Cert:\LocalMachine\My -ErrorAction SilentlyContinue } catch {}

    # Filter to code-signing capable certs when EKU is present
    $codeSigning = @()
    foreach ($c in $storeCerts) {
        try {
            $eku = $c.EnhancedKeyUsageList
            if ($eku) {
                $ekuNames = @($eku | ForEach-Object { $_.FriendlyName })
                $ekuOids = @(
                    $eku | ForEach-Object { $_.ObjectId.Value }
                    $eku | ForEach-Object { $_.ObjectId.ToString() }
                ) | Where-Object { $_ }
                if ($ekuNames -contains 'Code Signing' -or $ekuNames -contains 'Υπογραφή κώδικα' -or $ekuOids -contains '1.3.6.1.5.5.7.3.3') {
                    $codeSigning += $c
                }
            }
        } catch {
            # Some certs may not expose EKU via this property
            $codeSigning += $c
        }
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
        Write-Error "Store-based signing requires -Thumbprint or -SubjectMatch parameter. No automatic cert selection."
        exit 1
    }

    Write-Host "Using store certificate:" -ForegroundColor Cyan
    $selected | Select-Object Subject, Thumbprint, NotAfter | Format-List | Out-String | Write-Host
    $expectedThumb = ($selected.Thumbprint -replace '\s','').ToUpperInvariant()
    $signArgs = @('sign', '/fd', 'SHA256', '/tr', $TimestampServer, '/td', 'SHA256', '/d', 'Student Management System', '/sha1', $expectedThumb)
    $usedMethod = "store:$expectedThumb"
}

if (-not $signArgs) {
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
    try {
        $pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath, $CertPassword)
        $expectedThumb = ($pfxCert.Thumbprint -replace '\s','').ToUpperInvariant()
    } catch {
        Write-Error "Cannot open certificate ${CertPath}: $($_.Exception.Message)"
        exit 1
    }
    $signArgs = @('sign', '/f', $CertPath, '/p', $CertPassword, '/fd', 'SHA256', '/tr', $TimestampServer, '/td', 'SHA256', '/d', 'Student Management System')
    $usedMethod = "pfx:$CertPath"
}

# ---------------------------------------------------------------------------
# Decide what actually needs signing
# ---------------------------------------------------------------------------
function Get-SignerThumb([string]$file) {
    $s = Get-AuthenticodeSignature -FilePath $file
    if ($s.SignerCertificate) { return ($s.SignerCertificate.Thumbprint -replace '\s','').ToUpperInvariant() }
    return $null
}

$toSign = [System.Collections.Generic.List[string]]::new()
$skippedOurs = 0
$skippedForeign = 0

foreach ($f in $explicitTargets) {
    if ((Get-SignerThumb $f) -eq $expectedThumb) { $skippedOurs++; continue }
    $toSign.Add($f)
}
foreach ($f in $discoveredTargets) {
    $thumb = Get-SignerThumb $f
    if ($null -eq $thumb) { $toSign.Add($f); continue }
    if ($thumb -eq $expectedThumb) { $skippedOurs++ } else { $skippedForeign++ }
}

$allTargets = @($explicitTargets) + @($discoveredTargets | Where-Object { ($toSign -contains $_) -or ((Get-SignerThumb $_) -eq $expectedThumb) })

Write-Host ("Targets: {0} to sign, {1} already signed with this certificate, {2} signed by others (left alone)" -f $toSign.Count, $skippedOurs, $skippedForeign)

# ---------------------------------------------------------------------------
# Sign in batches
# ---------------------------------------------------------------------------
$signed = 0
for ($i = 0; $i -lt $toSign.Count; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize, $toSign.Count) - 1
    $batch = @($toSign[$i..$end])
    & $SignTool @signArgs @batch 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Signing failed with exit code $LASTEXITCODE (batch starting at $($batch[0]))"
        exit 1
    }
    $signed += $batch.Count
}

# ---------------------------------------------------------------------------
# Verify: every target must now carry the selected certificate
# ---------------------------------------------------------------------------
Write-Host "`n=== Verifying Signatures ===" -ForegroundColor Green
$bad = @()
foreach ($f in $allTargets) {
    $s = Get-AuthenticodeSignature -FilePath $f
    $thumb = if ($s.SignerCertificate) { ($s.SignerCertificate.Thumbprint -replace '\s','').ToUpperInvariant() } else { $null }
    $chainOk = $s.Status -eq 'Valid' -or $s.Status -eq 'UnknownError'   # UnknownError = chain not trusted on this machine, signature intact
    if ($thumb -ne $expectedThumb -or -not $chainOk) {
        $bad += "$f → status $($s.Status), signer $thumb"
    }
}

if ($bad.Count -gt 0) {
    $bad | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
    Write-Error "Signature verification failed for $($bad.Count) file(s)"
    exit 1
}

if (-not $pathMode) {
    $Signature = Get-AuthenticodeSignature $InstallerPath
    Write-Host "Status: $($Signature.Status)"
    Write-Host "Signer: $($Signature.SignerCertificate.Subject)"
}

Write-Host "`n✅ Signed $signed file(s); $($allTargets.Count) target(s) verified with certificate $expectedThumb" -ForegroundColor Green
Write-Host "   Method: $usedMethod" -ForegroundColor DarkCyan
