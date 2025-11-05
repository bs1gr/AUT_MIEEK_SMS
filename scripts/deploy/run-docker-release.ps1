param(
    [switch]$Force,
    [switch]$SkipStart,
    [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..' '..')
$smartSetup = Join-Path $repoRoot 'SMART_SETUP.ps1'
if (-not (Test-Path $smartSetup)) {
    throw "SMART_SETUP.ps1 not found at $smartSetup"
}

$previousEnv = $env:SMS_ENV
$previousMode = $env:SMS_EXECUTION_MODE
try {
    $env:SMS_ENV = 'production'
    $env:SMS_EXECUTION_MODE = 'docker'

    $smartArgs = @('-PreferDocker')
    if ($Force) { $smartArgs += '-Force' }
    if ($SkipStart) { $smartArgs += '-SkipStart' }
    if ($Verbose) { $smartArgs += '-Verbose' }

    Write-Host 'Launching SMART_SETUP.ps1 in Docker release mode...' -ForegroundColor Cyan
    & $smartSetup @smartArgs
} finally {
    if ($null -eq $previousEnv) {
        Remove-Item Env:SMS_ENV -ErrorAction SilentlyContinue
    } else {
        $env:SMS_ENV = $previousEnv
    }

    if ($null -eq $previousMode) {
        Remove-Item Env:SMS_EXECUTION_MODE -ErrorAction SilentlyContinue
    } else {
        $env:SMS_EXECUTION_MODE = $previousMode
    }
}
