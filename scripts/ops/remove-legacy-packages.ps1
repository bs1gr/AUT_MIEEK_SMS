<#
.SYNOPSIS
    Deletes or privatizes legacy GitHub Container Registry (GHCR) packages.

.DESCRIPTION
    Enumerates all versions for the specified container packages under a GitHub organization
    and either deletes every version (default) or toggles the package visibility to private.
    Intended to support the v1.6.3 release process where sms-backend, sms-frontend, and
    sms-fullstack images must be retired or hidden from public automation.

.PARAMETER Org
    GitHub organization or user that owns the container packages. Defaults to 'bs1gr'.

.PARAMETER Packages
    One or more container package names (without the ghcr.io prefix). Defaults to the three
    SMS images: sms-backend, sms-frontend, sms-fullstack.

.PARAMETER DryRun
    When specified, the script only reports what would be deleted/updated.

.PARAMETER Privatize
    Instead of deleting versions, call the GH API to set each package visibility to 'private'.

.PARAMETER PackageDataPath
    Optional path to a JSON file that maps package names to the version arrays returned by the
    GitHub Packages API. Use this for offline dry-runs so the script can operate without
    contacting GitHub.

.PARAMETER GhPath
    Path or command name for the GitHub CLI executable in case `gh` is not available on PATH.

.EXAMPLE
    pwsh -NoProfile -File scripts/ops/remove-legacy-packages.ps1 -DryRun

.EXAMPLE
    pwsh -NoProfile -File scripts/ops/remove-legacy-packages.ps1 -Privatize

.NOTES
    Requires GitHub CLI (`gh`) authenticated with repo and packages:write scopes.
    Date: 2025-11-15
#>
param(
    [Parameter()][string]$Org = "bs1gr",
    [Parameter()][string[]]$Packages = @("sms-backend", "sms-frontend", "sms-fullstack"),
    [Parameter()][string]$PackageDataPath,
    [Parameter()][string]$GhPath,
    [switch]$DryRun,
    [switch]$Privatize
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:GhExecutable = $null
$script:PackageData = $null

if ($PackageDataPath) {
    if (-not (Test-Path -LiteralPath $PackageDataPath)) {
        throw "PackageDataPath '$PackageDataPath' does not exist."
    }
    $raw = Get-Content -LiteralPath $PackageDataPath -Raw -Encoding UTF8
    $script:PackageData = $raw | ConvertFrom-Json -AsHashtable
}

function Resolve-GhCommand {
    param()
    if ($script:GhExecutable) {
        return
    }
    if ($GhPath) {
        $resolved = Get-Command $GhPath -ErrorAction Stop
    }
    else {
        $resolved = Get-Command gh -ErrorAction SilentlyContinue
    }
    if (-not $resolved) {
        throw "GitHub CLI (gh) is required. Install it from https://cli.github.com/ and authenticate before running this script."
    }
    $script:GhExecutable = $resolved.Source
}

function Invoke-Gh {
    param([string[]]$Arguments)
    Resolve-GhCommand
    & $script:GhExecutable @Arguments
}

function Get-PackageVersions {
    param([string]$Package)

    if ($script:PackageData) {
        if (-not $script:PackageData.ContainsKey($Package)) {
            return @()
        }
        $value = $script:PackageData[$Package]
        if ($null -eq $value) {
            return @()
        }
        if ($value -isnot [System.Collections.IEnumerable]) {
            return @($value)
        }
        return $value
    }

    $page = 1
    $all = @()
    while ($true) {
        $endpoint = "/orgs/$Org/packages/container/$Package/versions?per_page=100&page=$page"
        $json = Invoke-Gh -Arguments @('api', '-H', 'Accept: application/vnd.github+json', $endpoint)
        if (-not $json) {
            break
        }
        $payload = $json | ConvertFrom-Json
        if (-not $payload) {
            break
        }
        $all += $payload
        if ($payload.Count -lt 100) {
            break
        }
        $page += 1
    }
    return $all
}

$results = @()
foreach ($package in $Packages) {
    Write-Host "Inspecting $package ..."
    $versions = Get-PackageVersions -Package $package
    $versionCount = if ($versions) { $versions.Count } else { 0 }

    if ($Privatize) {
        $results += [pscustomobject]@{
            Package      = $package
            Action       = 'Privatize'
            VersionCount = $versionCount
            Notes        = 'Set visibility to private'
        }
        if ($DryRun) {
            continue
        }
        $body = @{ visibility = 'private' } | ConvertTo-Json -Depth 3
        $temp = [System.IO.Path]::GetTempFileName()
        try {
            Set-Content -LiteralPath $temp -Value $body -Encoding UTF8
            Invoke-Gh -Arguments @(
                'api', '--method', 'PATCH',
                '-H', 'Accept: application/vnd.github+json',
                '-H', 'Content-Type: application/json',
                '--input', $temp,
                "/orgs/$Org/packages/container/$package"
            ) | Out-Null
            Write-Host "Visibility updated for $package."
        }
        finally {
            Remove-Item -LiteralPath $temp -ErrorAction SilentlyContinue
        }
        continue
    }

    $versionIds = @()
    if ($versions) {
        $versionIds = @($versions | ForEach-Object { $_.id })
    }

    $results += [pscustomobject]@{
        Package      = $package
        Action       = 'Delete versions'
        VersionCount = $versionIds.Count
        Notes        = 'DELETE /versions/{id}'
    }

    if ($DryRun -or -not $versionIds) {
        continue
    }

    foreach ($id in $versionIds) {
        Write-Host "Deleting $package version $id ..."
        Invoke-Gh -Arguments @(
            'api', '--method', 'DELETE',
            '-H', 'Accept: application/vnd.github+json',
            "/orgs/$Org/packages/container/$package/versions/$id"
        ) | Out-Null
    }
}

if ($results) {
    Write-Host "Summary" -ForegroundColor Cyan
    $results | Format-Table -AutoSize
}
else {
    Write-Host "No packages processed." -ForegroundColor Yellow
}
