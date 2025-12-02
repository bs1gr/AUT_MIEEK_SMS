[CmdletBinding()]
param(
    [string]$Output = "version-report.md"
)

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$VERSION_FILE = Join-Path $ROOT_DIR 'VERSION'
$FRONTEND_PKG = Join-Path $ROOT_DIR 'frontend\package.json'

function Get-Version {
    if (Test-Path $VERSION_FILE) { return (Get-Content $VERSION_FILE -Raw).Trim() }
    return 'unknown'
}

function Get-FrontendVersion {
    if (Test-Path $FRONTEND_PKG) {
        try { return ((Get-Content $FRONTEND_PKG -Raw | ConvertFrom-Json).version -as [string]) }
        catch { return 'unknown' }
    }
    return 'unknown'
}

$version = Get-Version
$feVersion = Get-FrontendVersion
$date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$report = @"
# Student Management System - Version Report

Generated: $date

- VERSION file: $version
- Frontend package.json: $feVersion
- Consistent: $([bool]($version -eq $feVersion))
"@

Set-Content -Path (Join-Path $ROOT_DIR $Output) -Value $report -Encoding UTF8
Write-Host "✅ Version report written to $Output" -ForegroundColor Green
exit 0
