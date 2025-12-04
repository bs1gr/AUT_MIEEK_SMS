# Verify version consistency between VERSION file and frontend package.json
[CmdletBinding()]
param(
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$VERSION_FILE = Join-Path $ROOT_DIR 'VERSION'
$FRONTEND_PKG = Join-Path $ROOT_DIR 'frontend\package.json'

function Get-Version {
    if (Test-Path $VERSION_FILE) { return (Get-Content $VERSION_FILE -Raw).Trim() }
    return ''
}

function Get-FrontendVersion {
    if (Test-Path $FRONTEND_PKG) {
        try {
            $pkg = Get-Content $FRONTEND_PKG -Raw | ConvertFrom-Json
            return ($pkg.version -as [string])
        } catch { return '' }
    }
    return ''
}

$version = Get-Version
$feVersion = Get-FrontendVersion

Write-Host "VERSION: $version"
Write-Host "Frontend package.json: $feVersion"

if ([string]::IsNullOrWhiteSpace($version) -or [string]::IsNullOrWhiteSpace($feVersion)) {
    Write-Host "⚠️  Missing version information" -ForegroundColor Yellow
    if ($Strict) { exit 1 } else { exit 0 }
}

if ($version -ne $feVersion) {
    Write-Host "❌ Version mismatch: VERSION ($version) != frontend ($feVersion)" -ForegroundColor Red
    if ($Strict) { exit 1 } else { exit 0 }
} else {
    Write-Host "✅ Version consistency OK" -ForegroundColor Green
    exit 0
}
