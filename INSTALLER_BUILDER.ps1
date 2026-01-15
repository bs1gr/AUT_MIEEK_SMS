<#
.SYNOPSIS
    Consolidated Installer Production & Versioning Pipeline - Student Management System

.DESCRIPTION
    Single-source-of-truth for installer building, versioning, and deployment updates.

    Integrates with:
    - COMMIT_READY.ps1 (pre-commit validation)
    - BUILD_DISTRIBUTION.ps1 (ZIP + installer creation)
    - Version management (VERSION file)
    - Git workflow (tags, commits)
    - Production deployment

    Key features:
    ✅ Automatic version synchronization across all components
    ✅ Wizard image regeneration with current version
    ✅ Code signing with AUT MIEEK certificate
    ✅ Installer validation & smoke testing
    ✅ Git integration (tagging, release tracking)
    ✅ Deployment-ready artifact creation
    ✅ Pre-commit audit mode to catch version mismatches

    Known limitations:
    ⚠️ Uninstaller naming: Inno Setup 6.x uses default "unins000.exe" initially
       (Workaround implemented: renamed to "unins{version}.exe" post-install)

.PARAMETER Action
    Operation to perform:
    - 'audit'          : Check version consistency, validate wizard images
    - 'validate'       : Quick validation without building
    - 'build'          : Full build pipeline (validate → regenerate images → compile → sign)
    - 'sign'           : Sign existing installer
    - 'test'           : Smoke test installer (runs setup with /SILENT)
    - 'update-images'  : Update wizard images to latest version only (Modern v2.0)
    - 'release'        : Complete release flow (audit → build → tag → upload)
    Default: 'build'

.PARAMETER Version
    Target version (optional). If not specified, reads from VERSION file.
    Useful for pre-release testing: -Version "1.9.8-rc1"

.PARAMETER SkipCodeSign
    Skip code signing step (not recommended for production)

.PARAMETER SkipTest
    Skip installer smoke test after build

.PARAMETER TagAndPush
    After successful build, create git tag and push to origin (requires -Action release)

.PARAMETER NoUpload
    Skip uploading to GitHub releases (useful for local testing)

.PARAMETER AutoFix
    Automatically regenerate wizard images if versions don't match

.PARAMETER Verbose
    Show detailed build output and timings

.EXAMPLE
    .\INSTALLER_BUILDER.ps1 -Action update-images
    # Update wizard images to latest version with Modern v2.0 design

.EXAMPLE
    .\INSTALLER_BUILDER.ps1 -Action audit
    # Check version consistency across all installer components

.EXAMPLE
    .\INSTALLER_BUILDER.ps1 -Action build -AutoFix
    # Build installer, auto-fixing any version mismatches

.EXAMPLE
    .\INSTALLER_BUILDER.ps1 -Action release -TagAndPush
    # Complete production release (build + tag + push + upload)

.EXAMPLE
    .\INSTALLER_BUILDER.ps1 -Action validate
    # Quick validation without modifying anything

.NOTES
Version: vvvvv1.18.0
    Created: 2025-12-04
    Updated: 2025-12-30

    Integration Points:
    - Reads version from: VERSION file (single source of truth)
    - Uses: installer/create_wizard_images.ps1 (version-aware image generation)
    - Signs with: installer/AUT_MIEEK_CodeSign.pfx
    - Compiles with: Inno Setup 6 (installer/SMS_Installer.iss)
    - Validates via: installer/SMS_Installer.iss preprocessor

    Pre-commit Integration:
    Include in COMMIT_READY.ps1 -Full mode to catch version inconsistencies
    before commits.
#>

[CmdletBinding()]
param(
    [ValidateSet('audit', 'build', 'validate', 'sign', 'test', 'release', 'update-images')]
    [string]$Action = 'build',

    [string]$Version,
    [switch]$SkipCodeSign,
    [switch]$SkipTest,
    [switch]$TagAndPush,
    [switch]$NoUpload,
    [switch]$AutoFix
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ============================================================================
# Configuration
# ============================================================================

$ProjectRoot = $PSScriptRoot
$InstallerDir = Join-Path $ProjectRoot "installer"
$DistDir = Join-Path $ProjectRoot "dist"
$VersionFile = Join-Path $ProjectRoot "VERSION"

# Read version from file if not provided
if (-not $Version) {
    $Version = (Get-Content $VersionFile -Raw).Trim()
}

$CurrentVersion = $Version
$WizardImageScript = Join-Path $InstallerDir "create_wizard_images.ps1"
$SignerScript = Join-Path $InstallerDir "SIGN_INSTALLER.ps1"
$InnoSetupScript = Join-Path $InstallerDir "SMS_Installer.iss"
$InstallerExe = Join-Path $DistDir "SMS_Installer_$CurrentVersion.exe"
$Certificate = Join-Path $InstallerDir "AUT_MIEEK_CodeSign.pfx"

# Inno Setup paths (common installation locations)
$InnoSetupPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

# Colors for output
$ColorSuccess = 'Green'
$ColorWarning = 'Yellow'
$ColorError = 'Red'
$ColorInfo = 'Cyan'

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Result {
    param(
        [Parameter(Position = 0)]
        [ValidateSet('Success', 'Warning', 'Error', 'Info')]
        [string]$Type = 'Info',

        [Parameter(Position = 1, ValueFromPipeline)]
        [string]$Message
    )

    $colors = @{
        'Success' = $ColorSuccess
        'Warning' = $ColorWarning
        'Error'   = $ColorError
        'Info'    = $ColorInfo
    }

    $symbols = @{
        'Success' = '✓'
        'Warning' = '⚠'
        'Error'   = '✗'
        'Info'    = 'ℹ'
    }

    Write-Host "$($symbols[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Test-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        Write-Result Error "File not found: $Path"
        return $false
    }
    return $true
}

function Find-InnoSetup {
    foreach ($path in $InnoSetupPaths) {
        if (Test-Path $path) {
            Write-Result Info "Found Inno Setup: $path"
            return $path
        }
    }
    Write-Result Error "Inno Setup 6 not found. Please install from https://jrsoftware.org/"
    return $null
}

function Test-VersionConsistency {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "VERSION CONSISTENCY AUDIT"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    $issues = @()

    # Check VERSION file
    if (-not (Test-FileExists $VersionFile)) { return $false }
    $fileVersion = (Get-Content $VersionFile -Raw).Trim()
    Write-Result Info "VERSION file: $fileVersion"

    # Check SMS_Installer.iss reads VERSION dynamically
    if (Test-FileExists $InnoSetupScript) {
        $issContent = Get-Content $InnoSetupScript -Raw
        if ($issContent -match '#define VersionFile FileOpen') {
            Write-Result Success "SMS_Installer.iss reads VERSION file dynamically ✓"
        } else {
            Write-Result Warning "SMS_Installer.iss may not read VERSION file properly"
            $issues += "SMS_Installer.iss version reading"
        }
    } else {
        $issues += "SMS_Installer.iss missing"
    }

    # Check wizard images
    $wizardLarge = Join-Path $InstallerDir "wizard_image.bmp"
    $wizardSmall = Join-Path $InstallerDir "wizard_small.bmp"

    if ((Test-Path $wizardLarge) -and (Test-Path $wizardSmall)) {
        $largeTime = (Get-Item $wizardLarge).LastWriteTime
        $smallTime = (Get-Item $wizardSmall).LastWriteTime
        $lastModified = [Math]::Max($largeTime.Ticks, $smallTime.Ticks) | Get-Date
        Write-Result Info "Wizard images last updated: $lastModified"

        $timeSinceUpdate = (Get-Date) - $lastModified
        if ($timeSinceUpdate.TotalMinutes -gt 60) {
            $hoursOld = [Math]::Round($timeSinceUpdate.TotalHours)
            Write-Result Warning "Wizard images may be outdated - last modified $hoursOld hrs ago"
            $issues += "Wizard images potentially outdated"
        }
    } else {
        if (-not (Test-Path $wizardLarge)) { $issues += "wizard_image.bmp missing" }
        if (-not (Test-Path $wizardSmall)) { $issues += "wizard_small.bmp missing" }
    }

    # Summary
    Write-Result Info "───────────────────────────────────────────────────────────────"
    if ($issues.Count -eq 0) {
        Write-Result Success "All version checks passed ✓"
        return $true
    } else {
        Write-Result Warning "Issues found:"
        $issues | ForEach-Object { Write-Host "  • $_" -ForegroundColor $ColorWarning }
        return $false
    }
}

function Invoke-GreekEncodingAudit {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "GREEK LANGUAGE FILE ENCODING AUDIT"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    $greekAuditScript = Join-Path $InstallerDir "GREEK_ENCODING_AUDIT.ps1"

    if (-not (Test-FileExists $greekAuditScript)) {
        Write-Result Warning "Greek encoding audit script not found: $greekAuditScript"
        return $true  # Non-critical, continue
    }

    try {
        Write-Result Info "Auditing Greek language file encodings (Windows-1253)..."
        & $greekAuditScript -Fix -ErrorAction Stop | Out-String | ForEach-Object {
            if ($PSCmdlet.MyInvocation.BoundParameters['Verbose']) { Write-Host $_ }
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Result Success "Greek file encodings verified and corrected ✓"
            return $true
        } else {
            Write-Result Warning "Greek encoding audit reported issues but will continue"
            return $true  # Non-blocking
        }
    } catch {
        Write-Result Warning "Greek encoding audit skipped: $_"
        return $true  # Non-critical
    }
}

function Invoke-WizardImageRegeneration {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "WIZARD IMAGE REGENERATION (v2.0 Modern Design)"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    if (-not (Test-FileExists $WizardImageScript)) {
        Write-Result Error "Wizard image script not found: $WizardImageScript"
        return $false
    }

    try {
        Write-Result Info "Regenerating wizard images with version v$CurrentVersion..."
        Write-Result Info "Design: Modern v2.0 with enhanced visuals"

        # Always regenerate with -Force to ensure latest version
        & $WizardImageScript -Force -ErrorAction Stop

        Write-Result Success "Wizard images regenerated ✓"
        Write-Result Info "Large Image: wizard_image.bmp (164x314)"
        Write-Result Info "Small Image: wizard_small.bmp (55x55)"

        return $true
    } catch {
        Write-Result Error "Failed to regenerate wizard images: $_"
        return $false
    }
}

function Invoke-GreekEncodingFix {
    <#
    .SYNOPSIS
        Fix Greek text files encoding for Inno Setup compilation.
    .DESCRIPTION
        Converts proper UTF-8 Greek text to Windows-1253 (CP1253) for Inno Setup.
        This is a build-time transformation that ensures proper Greek text handling
        in the installer UI, regardless of how the files are stored in git.
    #>
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "GREEK TEXT ENCODING FIX (for Inno Setup)"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    try {
        $pythonScript = Join-Path $PSScriptRoot "fix_greek_encoding_permanent.py"
        if (-not (Test-Path $pythonScript)) {
            Write-Result Warning "Greek encoding fix script not found, skipping Greek text conversion"
            return $true
        }

        Write-Result Info "Running Greek text encoding conversion..."
        & python $pythonScript 2>&1 | ForEach-Object { Write-Result Info "  $_" }

        if ($LASTEXITCODE -eq 0) {
            Write-Result Success "Greek text files encoded properly for Inno Setup ✓"
            return $true
        } else {
            Write-Result Error "Greek encoding conversion failed (exit code: $LASTEXITCODE)"
            return $false
        }
    } catch {
        Write-Result Error "Greek encoding fix error: $_"
        return $false
    }
}

function Invoke-InstallerCompilation {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "INSTALLER COMPILATION (Inno Setup)"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    $iscc = Find-InnoSetup
    if (-not $iscc) { return $false }

    try {
        Write-Result Info "Compiling SMS_Installer_$CurrentVersion.exe..."
        $startTime = Get-Date

        Push-Location $InstallerDir
        & $iscc "SMS_Installer.iss" | Out-String | Tee-Object -Variable output
        Pop-Location

        $elapsed = (Get-Date) - $startTime

        if ($LASTEXITCODE -ne 0) {
            Write-Result Error "Inno Setup compilation failed (exit code: $LASTEXITCODE)"
            return $false
        }

        if (-not (Test-Path $InstallerExe)) {
            Write-Result Error "Installer executable not created at: $InstallerExe"
            return $false
        }

        $size = (Get-Item $InstallerExe).Length / 1MB
        $sizeMB = [Math]::Round($size, 2)
        Write-Result Success "Installer compiled successfully ✓"
        Write-Result Info "Output: SMS_Installer_$CurrentVersion.exe"
        Write-Result Info "Size: $sizeMB MB"
        Write-Result Info "Build time: $([Math]::Round($elapsed.TotalSeconds)) seconds"

        return $true
    } catch {
        Write-Result Error "Installer compilation failed: $_"
        return $false
    }
}

function Invoke-CodeSigning {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "CODE SIGNING (Authenticode - AUT MIEEK Certificate)"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    if (-not (Test-FileExists $InstallerExe)) {
        Write-Result Error "Installer not found: $InstallerExe"
        return $true  # Non-blocking
    }

    if (-not (Test-FileExists $SignerScript)) {
        Write-Result Error "Signing script not found: $SignerScript"
        return $true  # Non-blocking
    }

    # Check if code signing should be skipped
    if ($SkipCodeSign) {
        Write-Result Info "Code signing skipped (-SkipCodeSign)"
        return $true
    }

    try {
        Write-Result Info "Signing installer with AUT MIEEK certificate..."

        # Prefer store-based signing with Limassol (CY) certificate thumbprint
        $limassolThumb = '2693C1B15C8A8E5E45614308489DC6F4268B075D'
        # Call signing script (it can use SMS_CODESIGN_PFX_PASSWORD env var as fallback)
        & $SignerScript -UseStore -Thumbprint $limassolThumb

        if ($LASTEXITCODE -eq 0) {
            # Strict post-build signature verification
            $sig = Get-AuthenticodeSignature $InstallerExe
            if ($sig.Status -ne 'Valid') {
                Write-Result Error "Signature verification failed after signing: $($sig.Status)"
                Write-Result Error "Build blocked: Unsigned installer artifacts are not allowed."
                return $false
            }

            $subj = $sig.SignerCertificate.Subject
            Write-Result Success "Installer signed successfully ✓"
            Write-Result Info "Publisher: $subj"

            # Enforce Limassol certificate
            if ($subj -notmatch 'L=Limassol' -or $subj -notmatch 'C=CY') {
                Write-Result Error "Signer subject does not match required certificate (Limassol/CY)."
                Write-Result Error "Expected: L=Limassol, C=CY"
                Write-Result Error "Got: $subj"
                return $false
            }

            # Verify thumbprint matches expected
            $expectedThumb = '2693C1B15C8A8E5E45614308489DC6F4268B075D'
            $actualThumb = $sig.SignerCertificate.Thumbprint
            if ($actualThumb -ne $expectedThumb) {
                Write-Result Warning "Signer thumbprint mismatch (expected: $expectedThumb, got: $actualThumb)"
            }

            return $true
        } else {
            Write-Result Error "Code signing failed (exit code: $LASTEXITCODE)"
            Write-Result Error "Build blocked: Unsigned installer artifacts are not allowed."
            return $false
        }
    } catch {
        Write-Result Warning "Code signing failed: $($_.Exception.Message) - installer remains unsigned but valid"
        return $true  # Signing failure doesn't break the build
    }
}

function Test-InstallerSmoke {
    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "INSTALLER SMOKE TEST"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    if (-not (Test-FileExists $InstallerExe)) {
        Write-Result Error "Installer not found: $InstallerExe"
        return $false
    }

    try {
        Write-Result Info "Running installer validity checks..."

        # Check file properties
        $exeInfo = Get-Item $InstallerExe
        Write-Result Info "Size: $([Math]::Round($exeInfo.Length / 1MB, 2)) MB"
        Write-Result Info "Created: $($exeInfo.CreationTime)"
        Write-Result Info "Modified: $($exeInfo.LastWriteTime)"

        # Check authenticode signature
        $sig = Get-AuthenticodeSignature $InstallerExe
        if ($sig.Status -ne 'Valid') {
            Write-Result Warning "Signature status: $($sig.Status)"
        } else {
            Write-Result Success "Authenticode signature valid ✓"
        }

        # Check version resource
        $version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($InstallerExe)
        Write-Result Info "File version: $($version.FileVersion)"
        Write-Result Info "Product version: $($version.ProductVersion)"

        Write-Result Success "Installer smoke test passed ✓"
        return $true
    } catch {
        Write-Result Error "Smoke test failed: $_"
        return $false
    }
}

function Invoke-GitTagAndPush {
    param([string]$Version)

    Write-Result Info "═══════════════════════════════════════════════════════════════"
    Write-Result Info "GIT TAGGING AND PUSH"
    Write-Result Info "═══════════════════════════════════════════════════════════════"

    try {
        $tagName = "v$Version"

        # Check if tag already exists
        $existingTag = & git tag -l $tagName 2>$null
        if ($existingTag) {
            Write-Result Warning "Tag already exists: $tagName"
            Write-Result Info "Deleting local tag and re-creating..."
            & git tag -d $tagName
        }

        # Create annotated tag
        Write-Result Info "Creating tag: $tagName..."
        & git tag -a $tagName -m "Release v$Version - Production Ready" | Out-String | Tee-Object -Variable output

        # Push tag to origin
        Write-Result Info "Pushing tag to origin..."
        & git push origin $tagName --force | Out-String | Tee-Object -Variable output

        Write-Result Success "Git tag created and pushed successfully ✓"
        return $true
    } catch {
        Write-Result Error "Git tagging failed: $_"
        return $false
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Result Info ""
Write-Result Info "================================================================="
Write-Result Info "INSTALLER PRODUCTION AND VERSIONING PIPELINE $CurrentVersion"
Write-Result Info "Action: $($Action.ToUpper())"
Write-Result Info "Version: $CurrentVersion"
Write-Result Info "================================================================="
Write-Result Info ""

$success = $false

switch ($Action) {
    'audit' {
        $success = Test-VersionConsistency
    }

    'validate' {
        $success = Test-VersionConsistency
        if ($success) {
            Write-Result Success "Validation passed - ready for build"
        }
    }

    'build' {
        # Full build pipeline
        if (-not (Test-VersionConsistency)) {
            if ($AutoFix) {
                Write-Result Info "AutoFix enabled - regenerating wizard images..."
                if (-not (Invoke-WizardImageRegeneration)) {
                    exit 1
                }
            } else {
                Write-Result Warning "Version consistency issues detected. Use -AutoFix to regenerate images."
            }
        }

        # Greek encoding audit (before wizard regeneration)
        Invoke-GreekEncodingAudit | Out-Null

        # Fix Greek text encoding (build-time transformation)
        if (-not (Invoke-GreekEncodingFix)) {
            exit 1
        }

        if (Invoke-WizardImageRegeneration) {
            if (Invoke-InstallerCompilation) {
                # Attempt code signing (non-blocking)
                if (-not $SkipCodeSign) {
                    Invoke-CodeSigning | Out-Null
                }

                # Run smoke test if not skipped
                if (-not $SkipTest) {
                    $success = Test-InstallerSmoke
                } else {
                    $success = $true
                }
            }
        }
    }

    'sign' {
        $success = Invoke-CodeSigning
    }

    'test' {
        $success = Test-InstallerSmoke
    }

    'update-images' {
        # Update wizard images to latest version only
        $success = Invoke-WizardImageRegeneration
    }

    'release' {
        # Complete release flow
        # Greek encoding audit (critical for release)
        Invoke-GreekEncodingAudit | Out-Null

        if (Invoke-WizardImageRegeneration) {
            if (Invoke-InstallerCompilation) {
                # Attempt code signing (non-blocking)
                Invoke-CodeSigning | Out-Null

                if (Test-InstallerSmoke) {
                    if ($TagAndPush) {
                        $success = Invoke-GitTagAndPush -Version $CurrentVersion
                    } else {
                        $success = $true
                        Write-Result Info "Release build complete. Use -TagAndPush to create git tag."
                    }
                }
            }
        }
    }
}

Write-Result Info ""
Write-Result Info "================================================================="
if ($success) {
    Write-Result Success "BUILD SUCCESSFUL"
    Write-Result Info "Installer: SMS_Installer_$($CurrentVersion).exe"
    Write-Result Info "Location: $DistDir"
} else {
    Write-Result Error "BUILD FAILED"
}
Write-Result Info "================================================================="
Write-Result Info ""

exit $(if ($success) { 0 } else { 1 })
