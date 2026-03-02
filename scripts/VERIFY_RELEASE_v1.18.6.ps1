<#
.SYNOPSIS
    Comprehensive verification script for v1.18.6 release

.DESCRIPTION
    Performs three verification tasks:
    1. Checks GitHub Actions workflow status for v1.18.6 tag
    2. Verifies code signing and SHA256 checksums for installer
    3. Validates release artifacts and documentation

.PARAMETER Task
    Which verification task to run:
    - 'workflows' - Check GitHub Actions workflow status
    - 'signing' - Verify code signing and checksums
    - 'all' - Run all verification tasks (default)

.PARAMETER InstallerPath
    Path to downloaded installer (for signing verification)

.EXAMPLE
    .\VERIFY_RELEASE_v1.18.6.ps1 -Task all

.EXAMPLE
    .\VERIFY_RELEASE_v1.18.6.ps1 -Task signing -InstallerPath ".\SMS_Installer_1.18.6.exe"
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('workflows', 'signing', 'all')]
    [string]$Task = 'all',

    [Parameter(Mandatory=$false)]
    [string]$InstallerPath = ".\SMS_Installer_1.18.6.exe"
)

$ErrorActionPreference = "Stop"
$ReleaseVersion = "1.18.6"
$ReleaseTag = "v$ReleaseVersion"
$RepoOwner = "bs1gr"
$RepoName = "AUT_MIEEK_SMS"

# ANSI color codes for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Success {
    param([string]$Message)
    Write-Host "$Green✅ $Message$Reset"
}

function Write-Failure {
    param([string]$Message)
    Write-Host "$Red❌ $Message$Reset"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$Yellow⚠️  $Message$Reset"
}

function Write-Info {
    param([string]$Message)
    Write-Host "$Blue🔍 $Message$Reset"
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n$Blue═══════════════════════════════════════════════════════════$Reset"
    Write-Host "$Blue  $Message$Reset"
    Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset`n"
}

# Task 1: Check GitHub Actions workflow status
function Test-GitHubWorkflows {
    Write-Header "Task 1: GitHub Actions Workflow Status"

    # Check if gh CLI is available
    $ghAvailable = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)

    if (-not $ghAvailable) {
        Write-Warning "GitHub CLI (gh) not found. Install from: https://cli.github.com/"
        Write-Info "Alternative: Visit https://github.com/$RepoOwner/$RepoName/actions"
        return $false
    }

    Write-Info "Checking workflows triggered by tag: $ReleaseTag"

    try {
        # Get workflows related to the tag
        $workflows = gh run list --repo "$RepoOwner/$RepoName" --limit 10 --json conclusion,name,status,createdAt,event,headBranch | ConvertFrom-Json

        # Filter workflows triggered by the tag
        $tagWorkflows = $workflows | Where-Object { $_.event -eq 'push' -or $_.event -eq 'workflow_run' }

        if ($tagWorkflows.Count -eq 0) {
            Write-Warning "No recent workflows found. Tag may still be triggering workflows."
            Write-Info "Check manually: https://github.com/$RepoOwner/$RepoName/actions"
            return $false
        }

        Write-Info "Found $($tagWorkflows.Count) recent workflow runs:`n"

        $allSuccess = $true
        foreach ($wf in $tagWorkflows | Select-Object -First 5) {
            $status = $wf.status
            $conclusion = $wf.conclusion
            $name = $wf.name
            $created = $wf.createdAt

            $statusIcon = switch ($conclusion) {
                'success' { '✅' }
                'failure' { '❌' }
                'cancelled' { '🚫' }
                default { '⏳' }
            }

            Write-Host "  $statusIcon $name"
            Write-Host "     Status: $status | Conclusion: $conclusion"
            Write-Host "     Created: $created`n"

            if ($conclusion -ne 'success' -and $status -ne 'in_progress') {
                $allSuccess = $false
            }
        }

        if ($allSuccess) {
            Write-Success "All workflows completed successfully!"
        } else {
            Write-Failure "Some workflows failed or are still running"
        }

        Write-Info "`nView all workflows: https://github.com/$RepoOwner/$RepoName/actions"
        return $allSuccess

    } catch {
        Write-Failure "Failed to check workflows: $_"
        Write-Info "Manual check: https://github.com/$RepoOwner/$RepoName/actions"
        return $false
    }
}

# Task 2: Verify code signing and checksums
function Test-InstallerIntegrity {
    Write-Header "Task 2: Code Signing & Checksum Verification"

    $installerFile = $InstallerPath
    $checksumFile = "$installerFile.sha256"

    # Check if installer exists
    if (-not (Test-Path $installerFile)) {
        Write-Warning "Installer not found at: $installerFile"
        Write-Info "Download from: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"
        Write-Info "`nTo download with PowerShell:"
        Write-Host "  Invoke-WebRequest -Uri 'https://github.com/$RepoOwner/$RepoName/releases/download/$ReleaseTag/SMS_Installer_$ReleaseVersion.exe' -OutFile 'SMS_Installer_$ReleaseVersion.exe'"
        return $false
    }

    Write-Success "Installer found: $installerFile"

    # Verify code signature
    Write-Info "`nVerifying code signature..."
    try {
        $signature = Get-AuthenticodeSignature $installerFile

        Write-Host "`nSignature Details:"
        Write-Host "  Status: $($signature.Status)"
        Write-Host "  Status Message: $($signature.StatusMessage)"

        if ($signature.SignerCertificate) {
            Write-Host "  Signer: $($signature.SignerCertificate.Subject)"
            Write-Host "  Issuer: $($signature.SignerCertificate.Issuer)"
            Write-Host "  Valid From: $($signature.SignerCertificate.NotBefore)"
            Write-Host "  Valid Until: $($signature.SignerCertificate.NotAfter)"
            Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)"
        }

        if ($signature.Status -eq 'Valid') {
            Write-Success "`nCode signature is VALID ✅"
            $signatureValid = $true
        } else {
            Write-Failure "`nCode signature is INVALID or NOT TRUSTED ❌"
            Write-Warning "Status: $($signature.Status)"
            $signatureValid = $false
        }
    } catch {
        Write-Failure "Failed to verify signature: $_"
        $signatureValid = $false
    }

    # Verify SHA256 checksum
    Write-Info "`nVerifying SHA256 checksum..."

    if (-not (Test-Path $checksumFile)) {
        Write-Warning "Checksum file not found: $checksumFile"
        Write-Info "Download from: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"
        Write-Info "`nTo download with PowerShell:"
        Write-Host "  Invoke-WebRequest -Uri 'https://github.com/$RepoOwner/$RepoName/releases/download/$ReleaseTag/SMS_Installer_$ReleaseVersion.exe.sha256' -OutFile 'SMS_Installer_$ReleaseVersion.exe.sha256'"
        $checksumValid = $false
    } else {
        try {
            # Calculate actual hash
            $actualHash = (Get-FileHash $installerFile -Algorithm SHA256).Hash

            # Read expected hash from file
            $expectedHashLine = Get-Content $checksumFile -First 1
            $expectedHash = ($expectedHashLine -split '\s+')[0].Trim()

            Write-Host "`nChecksum Comparison:"
            Write-Host "  Expected: $expectedHash"
            Write-Host "  Actual:   $actualHash"

            if ($actualHash -eq $expectedHash) {
                Write-Success "`nChecksum verification PASSED ✅"
                $checksumValid = $true
            } else {
                Write-Failure "`nChecksum verification FAILED ❌"
                Write-Warning "The installer file may be corrupted or tampered with!"
                $checksumValid = $false
            }
        } catch {
            Write-Failure "Failed to verify checksum: $_"
            $checksumValid = $false
        }
    }

    # File properties
    Write-Info "`nInstaller File Properties:"
    $fileInfo = Get-Item $installerFile
    Write-Host "  Name: $($fileInfo.Name)"
    Write-Host "  Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
    Write-Host "  Created: $($fileInfo.CreationTime)"
    Write-Host "  Modified: $($fileInfo.LastWriteTime)"

    if ($fileInfo.VersionInfo) {
        Write-Host "  File Version: $($fileInfo.VersionInfo.FileVersion)"
        Write-Host "  Product Name: $($fileInfo.VersionInfo.ProductName)"
        Write-Host "  Company: $($fileInfo.VersionInfo.CompanyName)"
    }

    return ($signatureValid -and $checksumValid)
}

# Task 3: Validate release artifacts
function Test-ReleaseArtifacts {
    Write-Header "Task 3: Release Artifacts Validation"

    Write-Info "Checking release page: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"

    # Check if gh CLI is available
    $ghAvailable = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)

    if (-not $ghAvailable) {
        Write-Warning "GitHub CLI (gh) not found. Manual verification required."
        Write-Info "Visit: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"
        Write-Info "`nExpected assets:"
        Write-Host "  - SMS_Installer_$ReleaseVersion.exe"
        Write-Host "  - SMS_Installer_$ReleaseVersion.exe.sha256"
        return $false
    }

    try {
        # Get release information
        $release = gh release view $ReleaseTag --repo "$RepoOwner/$RepoName" --json assets,name,tagName,isLatest,publishedAt | ConvertFrom-Json

        Write-Host "`nRelease Information:"
        Write-Host "  Name: $($release.name)"
        Write-Host "  Tag: $($release.tagName)"
        Write-Host "  Published: $($release.publishedAt)"
        Write-Host "  Is Latest: $($release.isLatest)"

        Write-Host "`nRelease Assets:"
        $expectedAssets = @(
            "SMS_Installer_$ReleaseVersion.exe",
            "SMS_Installer_$ReleaseVersion.exe.sha256"
        )

        $foundAssets = @()
        $allAssetsPresent = $true

        foreach ($asset in $release.assets) {
            Write-Host "  ✅ $($asset.name) ($([math]::Round($asset.size / 1MB, 2)) MB)"
            $foundAssets += $asset.name
        }

        # Check for missing assets
        foreach ($expected in $expectedAssets) {
            if ($expected -notin $foundAssets) {
                Write-Failure "Missing expected asset: $expected"
                $allAssetsPresent = $false
            }
        }

        # Check for unexpected assets
        foreach ($found in $foundAssets) {
            if ($found -notin $expectedAssets) {
                Write-Warning "Unexpected asset found: $found"
                Write-Info "Asset sanitizer should have removed this. Check workflow logs."
            }
        }

        if ($allAssetsPresent) {
            Write-Success "`nAll expected assets are present!"
        } else {
            Write-Failure "`nSome expected assets are missing!"
        }

        return $allAssetsPresent

    } catch {
        Write-Failure "Failed to check release artifacts: $_"
        Write-Info "Manual check: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"
        return $false
    }
}

# Main execution
Write-Host "`n$Blue╔═══════════════════════════════════════════════════════════╗$Reset"
Write-Host "$Blue║  Release Verification Script - v$ReleaseVersion                   ║$Reset"
Write-Host "$Blue╚═══════════════════════════════════════════════════════════╝$Reset"

$results = @{}

if ($Task -eq 'workflows' -or $Task -eq 'all') {
    $results['workflows'] = Test-GitHubWorkflows
}

if ($Task -eq 'signing' -or $Task -eq 'all') {
    $results['signing'] = Test-InstallerIntegrity
}

if ($Task -eq 'all') {
    $results['artifacts'] = Test-ReleaseArtifacts
}

# Summary
Write-Header "Verification Summary"

$allPassed = $true
foreach ($test in $results.Keys) {
    $result = $results[$test]
    $icon = if ($result) { '✅' } else { '❌' }
    $status = if ($result) { 'PASS' } else { 'FAIL' }
    Write-Host "  $icon $test : $status"
    if (-not $result) { $allPassed = $false }
}

Write-Host ""
if ($allPassed) {
    Write-Success "All verification checks PASSED! ✅"
    Write-Success "v$ReleaseVersion release is verified and production-ready."
    exit 0
} else {
    Write-Failure "Some verification checks FAILED! ❌"
    Write-Warning "Review the output above and check:"
    Write-Host "  - GitHub Actions: https://github.com/$RepoOwner/$RepoName/actions"
    Write-Host "  - Release Page: https://github.com/$RepoOwner/$RepoName/releases/tag/$ReleaseTag"
    Write-Host "  - Documentation: docs/releases/DEPLOYMENT_CHECKLIST_v1.18.6.md"
    exit 1
}
