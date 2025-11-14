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

if ($env:SMS_ENV -and $env:SMS_ENV.Trim().ToLower() -eq 'production') {
    throw 'SMS_ENV is set to production. Native development helper refuses to run. Start the Docker release workflow instead.'
}

$previousEnv = $env:SMS_ENV
$previousMode = $env:SMS_EXECUTION_MODE
try {
    $env:SMS_ENV = 'development'
    $env:SMS_EXECUTION_MODE = 'native'

    $smartParams = @{ PreferNative = $true }
    if ($Force) { $smartParams['Force'] = $true }
    if ($SkipStart) { $smartParams['SkipStart'] = $true }
    if ($Verbose) { $smartParams['Verbose'] = $true }

    Write-Host 'Launching SMART_SETUP.ps1 in native development mode...' -ForegroundColor Cyan
    & $smartSetup @smartParams
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
