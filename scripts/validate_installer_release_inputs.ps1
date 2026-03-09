<#!
.SYNOPSIS
    Validates that installer compile-time inputs exist and are source-controlled.

.DESCRIPTION
    Prevents release-only failures caused by local-only installer assets that exist
    on a developer machine but are not tracked in git, and therefore are missing
    from clean CI checkouts.

    Prebuild mode validates tracked/static inputs only.
    Postbuild mode (-RequireGeneratedArtifacts) additionally requires generated
    compile-time assets (wizard bitmaps, SMS_Manager.exe) to exist.
#>

[CmdletBinding()]
param(
    [string]$InstallerScriptPath,
    [switch]$RequireGeneratedArtifacts
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $InstallerScriptPath) {
    $InstallerScriptPath = Join-Path $RepoRoot 'installer\SMS_Installer.iss'
}

if (-not (Test-Path $InstallerScriptPath)) {
    Write-Host "❌ Installer script not found: $InstallerScriptPath" -ForegroundColor Red
    exit 1
}

$InstallerScriptPath = [System.IO.Path]::GetFullPath($InstallerScriptPath)
$InstallerDir = Split-Path -Parent $InstallerScriptPath

$generatedAllowlist = @(
    'installer\wizard_image.bmp',
    'installer\wizard_small.bmp',
    'installer\dist\SMS_Manager.exe'
)

function Get-RepoRelativePath {
    param([string]$AbsolutePath)
    $relative = [System.IO.Path]::GetRelativePath($RepoRoot, $AbsolutePath)
    return ($relative -replace '/', '\\')
}

function Test-GitTracked {
    param([string]$RepoRelativePath)
    & git -C $RepoRoot ls-files --error-unmatch -- ($RepoRelativePath -replace '\\', '/') *> $null
    return ($LASTEXITCODE -eq 0)
}

function Test-GitIgnored {
    param([string]$RepoRelativePath)
    & git -C $RepoRoot check-ignore -q -- ($RepoRelativePath -replace '\\', '/') *> $null
    return ($LASTEXITCODE -eq 0)
}

function Resolve-InstallerReference {
    param([string]$Reference)
    return [System.IO.Path]::GetFullPath((Join-Path $InstallerDir $Reference))
}

$content = Get-Content $InstallerScriptPath
$references = New-Object System.Collections.Generic.List[object]
$seen = @{}

for ($i = 0; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $lineNo = $i + 1

    foreach ($match in [regex]::Matches($line, '(?i)(MessagesFile|LicenseFile|InfoBeforeFile|InfoAfterFile):\s*"([^"]+)"')) {
        $key = "$($match.Groups[1].Value)|$($match.Groups[2].Value)"
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $references.Add([pscustomobject]@{
                Kind = $match.Groups[1].Value
                Reference = $match.Groups[2].Value
                Line = $lineNo
            })
        }
    }

    $setupMatch = [regex]::Match($line, '(?i)^\s*(SetupIconFile|WizardImageFile|WizardSmallImageFile)\s*=\s*(.+?)\s*$')
    if ($setupMatch.Success) {
        $refValue = $setupMatch.Groups[2].Value.Trim()
        if ($refValue -match '^"([^"]+)"$') {
            $refValue = $Matches[1]
        }
        $key = "$($setupMatch.Groups[1].Value)|$refValue"
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $references.Add([pscustomobject]@{
                Kind = $setupMatch.Groups[1].Value
                Reference = $refValue
                Line = $lineNo
            })
        }
    }

    foreach ($match in [regex]::Matches($line, '(?i)Source:\s*"([^"]+)"')) {
        $refValue = $match.Groups[1].Value
        if ($refValue.Contains('*') -or $refValue.Contains('?')) {
            continue
        }
        $key = "Source|$refValue"
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $references.Add([pscustomobject]@{
                Kind = 'Source'
                Reference = $refValue
                Line = $lineNo
            })
        }
    }
}

$failures = New-Object System.Collections.Generic.List[string]

Write-Host "🔎 Validating installer release inputs from source-controlled checkout..." -ForegroundColor Cyan
Write-Host "   Script: $InstallerScriptPath" -ForegroundColor DarkCyan
Write-Host "   Mode:   $(if ($RequireGeneratedArtifacts) { 'postbuild (static + generated)' } else { 'prebuild (static tracked inputs only)' })" -ForegroundColor DarkCyan

foreach ($reference in $references) {
    $rawRef = $reference.Reference.Trim()
    if ([string]::IsNullOrWhiteSpace($rawRef)) { continue }
    if ($rawRef -like 'compiler:*') { continue }
    if ($rawRef.Contains('{')) { continue }

    $absolutePath = Resolve-InstallerReference -Reference $rawRef
    $repoRelative = Get-RepoRelativePath -AbsolutePath $absolutePath
    $isGenerated = $generatedAllowlist -contains $repoRelative

    if ($isGenerated -and -not $RequireGeneratedArtifacts) {
        Write-Host "ℹ️  [generated] $repoRelative (line $($reference.Line)) - skipped in prebuild mode" -ForegroundColor DarkYellow
        continue
    }

    if (-not (Test-Path $absolutePath)) {
        $details = if ($isGenerated) {
            'required generated artifact is missing'
        } elseif (Test-GitIgnored -RepoRelativePath $repoRelative) {
            'file is missing and ignored by git'
        } else {
            'file is missing from workspace'
        }
        $failures.Add("$($reference.Kind) line $($reference.Line): $rawRef -> $repoRelative ($details)")
        continue
    }

    if ($isGenerated) {
        Write-Host "✅ [generated] $repoRelative" -ForegroundColor Green
        continue
    }

    if (-not (Test-GitTracked -RepoRelativePath $repoRelative)) {
        $details = if (Test-GitIgnored -RepoRelativePath $repoRelative) {
            'exists locally but is ignored by git'
        } else {
            'exists locally but is not tracked by git'
        }
        $failures.Add("$($reference.Kind) line $($reference.Line): $rawRef -> $repoRelative ($details)")
        continue
    }

    Write-Host "✅ [tracked] $repoRelative" -ForegroundColor Green
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Installer release input validation failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "   - $failure" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Fix: track the file, stop referencing it, or switch the installer to an already tracked equivalent asset." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Installer release inputs validation passed" -ForegroundColor Green
exit 0
