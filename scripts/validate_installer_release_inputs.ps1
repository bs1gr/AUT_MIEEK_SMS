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
    A wildcard Source line (for example "src\backend\*") takes every file in its
    folder, tracked by git or not. On a developer's PC those folders also hold
    local files: settings with a secret key and a database password
    (config\.env), the key of the encrypted backups (src\backend\.keys),
    generated reports and exports, uploaded import files. An installer built
    there by hand packed them. So every file a wildcard line would take must be
    tracked by git or be excluded on that line; anything else fails the check,
    with the names of the files. (Until November 2026 only database files were
    looked for.) A checkout made by CI holds tracked files only and passes.

.PARAMETER RepoRoot
    The repository to check. Defaults to the one this script is in; the tests
    pass a throwaway repository.
#>

[CmdletBinding()]
param(
    [string]$InstallerScriptPath,
    [switch]$RequireGeneratedArtifacts,
    [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $RepoRoot) {
    $RepoRoot = Join-Path $PSScriptRoot '..'
}
$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not $InstallerScriptPath) {
    $InstallerScriptPath = Join-Path $RepoRoot 'infra\installer\windows\SMS_Installer.iss'
}

if (-not (Test-Path $InstallerScriptPath)) {
    Write-Host "❌ Installer script not found: $InstallerScriptPath" -ForegroundColor Red
    exit 1
}

$InstallerScriptPath = [System.IO.Path]::GetFullPath($InstallerScriptPath)
$InstallerDir = Split-Path -Parent $InstallerScriptPath

$generatedAllowlist = @(
    'infra\installer\windows\installer_welcome_el.rtf',
    'infra\installer\windows\installer_complete_el.rtf',
    'infra\installer\windows\wizard_image.bmp',
    'infra\installer\windows\wizard_small.bmp',
    'infra\installer\windows\dist\SMS_Manager.exe'
)

# Optional generated artifacts (don't block build if missing). Folder roots here are
# matched against wildcard Source: lines (e.g. "dist\SMS_Lite\*"), not single-file ones.
$optionalGeneratedAllowlist = @(
    'infra\installer\windows\dist\SMS_Lite'  # Built separately via PyInstaller, optional for Docker Edition
)

function Get-NormalizedRelativePath {
    param(
        [string]$BasePath,
        [string]$AbsolutePath
    )

    $basePath = [System.IO.Path]::GetFullPath($BasePath)
    $absolutePath = [System.IO.Path]::GetFullPath($AbsolutePath)

    if ([System.IO.Path].GetMethod('GetRelativePath', [type[]]@([string], [string]))) {
        $relative = [System.IO.Path]::GetRelativePath($basePath, $absolutePath)
    } else {
        $basePathWithSeparator = $basePath
        if (-not $basePathWithSeparator.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
            $basePathWithSeparator += [System.IO.Path]::DirectorySeparatorChar
        }

        $repoUri = [System.Uri]$basePathWithSeparator
        $absoluteUri = [System.Uri]$absolutePath
        $relative = [System.Uri]::UnescapeDataString($repoUri.MakeRelativeUri($absoluteUri).ToString())
    }

    $relative = $relative -replace '[\\/]+', '\'
    $relative = $relative -replace '^[.][\\/]+', ''
    return $relative
}

function Get-RepoRelativePath {
    param([string]$AbsolutePath)
    return Get-NormalizedRelativePath -BasePath $RepoRoot -AbsolutePath $AbsolutePath
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

function Split-InstallerExcludePatterns {
    param([string]$ExcludeValue)

    if ([string]::IsNullOrWhiteSpace($ExcludeValue)) {
        return @()
    }

    return @(
        $ExcludeValue -split ',' |
            ForEach-Object { $_.Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

function Get-InstallerSourceRoot {
    param([string]$Reference)

    $sourceDir = Split-Path -Path $Reference -Parent
    if ([string]::IsNullOrWhiteSpace($sourceDir)) {
        $sourceDir = '.'
    }

    return Resolve-InstallerReference -Reference $sourceDir
}

function Test-InstallerExcludeMatch {
    # Whether Inno Setup's Excludes would leave a file out. Its rules: a pattern without a
    # backslash is a name, of a file or of a folder at any depth ("tests" leaves out every
    # folder called tests with all it holds); a pattern that starts with a backslash is
    # matched from the source folder down; any other pattern with a backslash is matched
    # against the end of the path ("logs\*").
    param(
        [string]$RelativePath,
        [string[]]$ExcludePatterns
    )

    $normalizedRelativePath = ($RelativePath -replace '[\\/]+', '\').TrimStart('\')
    $names = $normalizedRelativePath -split '\\'

    foreach ($pattern in $ExcludePatterns) {
        $normalizedPattern = ($pattern -replace '[\\/]+', '\').Trim()
        if ([string]::IsNullOrWhiteSpace($normalizedPattern)) {
            continue
        }

        if ($normalizedPattern.StartsWith('\')) {
            if ($normalizedRelativePath -like $normalizedPattern.TrimStart('\')) {
                return $true
            }
            continue
        }

        if ($normalizedPattern.Contains('\')) {
            if ($normalizedRelativePath -like $normalizedPattern -or $normalizedRelativePath -like "*\$normalizedPattern") {
                return $true
            }
            continue
        }

        foreach ($name in $names) {
            if ($name -like $normalizedPattern) {
                return $true
            }
        }
    }

    return $false
}

$content = Get-Content $InstallerScriptPath
$references = New-Object System.Collections.Generic.List[object]
$wildcardSources = New-Object System.Collections.Generic.List[object]
$seen = @{}

for ($i = 0; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $lineNo = $i + 1

    # Skip Inno Setup comment lines and preprocessor #ifdef/#else/#endif blocks
    if ($line -match '^\s*;' -or $line -match '^\s*#(ifdef|else|endif|define|expr)\b') { continue }

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
        $excludeMatch = [regex]::Match($line, '(?i)\bExcludes:\s*"([^"]*)"')
        $excludePatterns = if ($excludeMatch.Success) {
            Split-InstallerExcludePatterns -ExcludeValue $excludeMatch.Groups[1].Value
        } else {
            @()
        }

        if ($refValue.Contains('*') -or $refValue.Contains('?')) {
            $wildcardKey = "SourceWildcard|$refValue|$($excludePatterns -join ',')"
            if (-not $seen.ContainsKey($wildcardKey)) {
                $seen[$wildcardKey] = $true
                $wildcardSources.Add([pscustomobject]@{
                    Kind = 'SourceWildcard'
                    Reference = $refValue
                    Line = $lineNo
                    ExcludePatterns = @($excludePatterns)
                    Recurses = [bool]($line -match '(?i)\brecursesubdirs\b')
                })
            }
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
    $isOptionalGenerated = $optionalGeneratedAllowlist -contains $repoRelative

    if (($isGenerated -or $isOptionalGenerated) -and -not $RequireGeneratedArtifacts) {
        Write-Host "ℹ️  [generated] $repoRelative (line $($reference.Line)) - skipped in prebuild mode" -ForegroundColor DarkYellow
        continue
    }

    if (-not (Test-Path $absolutePath)) {
        # Optional generated artifacts (like SMS_Lite.exe) are allowed to be missing
        if ($isOptionalGenerated) {
            Write-Host "⚠️  [optional-generated] $repoRelative (not required for Docker Edition)" -ForegroundColor Yellow
            continue
        }

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

    if ($isGenerated -or $isOptionalGenerated) {
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

foreach ($wildcardSource in $wildcardSources) {
    $sourceRoot = Get-InstallerSourceRoot -Reference $wildcardSource.Reference
    $repoRelativeRoot = Get-RepoRelativePath -AbsolutePath $sourceRoot
    $isOptionalGenerated = $optionalGeneratedAllowlist -contains $repoRelativeRoot

    if (-not (Test-Path $sourceRoot)) {
        # Optional generated artifacts (like SMS_Lite's onedir folder) are allowed
        # to be missing on a clean checkout — they're built separately via PyInstaller.
        if ($isOptionalGenerated) {
            Write-Host "⚠️  [optional-generated] $repoRelativeRoot (not required for Docker Edition)" -ForegroundColor Yellow
            continue
        }

        $failures.Add("$($wildcardSource.Kind) line $($wildcardSource.Line): $($wildcardSource.Reference) -> $repoRelativeRoot (wildcard source root missing from workspace)")
        continue
    }

    # A folder that a build step fills (SMS Lite) holds untracked files by its nature.
    if ($isOptionalGenerated -or ($generatedAllowlist -contains $repoRelativeRoot)) {
        Write-Host "ℹ️  [generated] $repoRelativeRoot\* (line $($wildcardSource.Line)) - not checked for untracked files" -ForegroundColor DarkYellow
        continue
    }

    # What the folder holds and git does not track, ignored files included: one question to
    # git for the whole folder. Names come back with forward slashes, unquoted.
    $rootForGit = ($repoRelativeRoot -replace '\\', '/').TrimEnd('/')
    $untracked = @(& git -C $RepoRoot -c core.quotepath=off ls-files --others -- $rootForGit)
    if ($LASTEXITCODE -ne 0) {
        $failures.Add("$($wildcardSource.Kind) line $($wildcardSource.Line): $($wildcardSource.Reference) -> $repoRelativeRoot (git could not list the folder)")
        continue
    }

    # Folders the line leaves out by name (node_modules, .venv, ...) hold tens of thousands of
    # files: they are dropped with one expression before the patterns are tried one by one.
    $plainNames = @($wildcardSource.ExcludePatterns | Where-Object { $_ -notmatch '[\\/*?]' } | ForEach-Object { [regex]::Escape($_) })
    $skipFolders = if ($plainNames.Count -gt 0) { '(^|/)(' + ($plainNames -join '|') + ')(/|$)' } else { $null }
    $filePattern = Split-Path -Path $wildcardSource.Reference -Leaf

    $leakedPayloads = New-Object System.Collections.Generic.List[string]
    foreach ($entry in $untracked) {
        $relativeForGit = $entry.Substring($rootForGit.Length).TrimStart('/')
        if ($skipFolders -and $relativeForGit -match $skipFolders) {
            continue
        }
        if (-not $wildcardSource.Recurses -and $relativeForGit.Contains('/')) {
            continue
        }
        if (($relativeForGit -split '/')[-1] -notlike $filePattern) {
            continue
        }
        if (Test-InstallerExcludeMatch -RelativePath ($relativeForGit -replace '/', '\') -ExcludePatterns $wildcardSource.ExcludePatterns) {
            continue
        }
        $leakedPayloads.Add(($entry -replace '/', '\'))
    }

    if ($leakedPayloads.Count -gt 0) {
        $examples = ($leakedPayloads | Select-Object -First 5) -join ', '
        $failures.Add("$($wildcardSource.Kind) line $($wildcardSource.Line): $($wildcardSource.Reference) would pack $($leakedPayloads.Count) file(s) that git does not track (for example: $examples). Add them to the line's Excludes, or remove them.")
        continue
    }

    Write-Host "✅ [wildcard] $repoRelativeRoot\* (line $($wildcardSource.Line)): tracked files only" -ForegroundColor Green
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
