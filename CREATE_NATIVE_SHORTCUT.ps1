[CmdletBinding()]
param(
    [string]$ShortcutName = 'SMS Native Toggle.lnk',
    [string]$Description = 'Start or stop SMS native development mode',
    [string]$IconLocation = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetPath = Join-Path $scriptDir 'NATIVE_TOGGLE.cmd'
$defaultNativeIconPath = Join-Path $scriptDir 'SMS_Native_Toggle.ico'
$fallbackIconPath = Join-Path $scriptDir 'favicon.ico'
$backendVenvPath = Join-Path $scriptDir 'backend\.venv'
$frontendNodeModulesPath = Join-Path $scriptDir 'frontend\node_modules'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath $ShortcutName

if (-not (Test-Path $targetPath)) {
    throw "NATIVE_TOGGLE.cmd not found at $targetPath"
}

if ((-not (Test-Path $backendVenvPath)) -or (-not (Test-Path $frontendNodeModulesPath))) {
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "🧹 Removed stale desktop shortcut: $shortcutPath" -ForegroundColor Yellow
    }

    Write-Host 'ℹ️  Native setup is missing, so the SMS Native Toggle shortcut is hidden/removed.' -ForegroundColor Cyan
    throw "SMS Native Toggle shortcut is only available for a prepared native environment. Run .\NATIVE.ps1 -Setup first."
}

if ([string]::IsNullOrWhiteSpace($IconLocation)) {
    if (Test-Path $defaultNativeIconPath) {
        $IconLocation = $defaultNativeIconPath
    }
    elseif (Test-Path $fallbackIconPath) {
        $IconLocation = $fallbackIconPath
    }
    else {
        $IconLocation = 'shell32.dll,24'
    }
}

$wshShell = $null

try {
    $wshShell = New-Object -ComObject WScript.Shell

    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
    }

    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.Description = $Description
    $shortcut.IconLocation = $IconLocation
    $shortcut.Save()

    Write-Host "✅ Created desktop shortcut: $shortcutPath" -ForegroundColor Green
    Write-Host "🎨 Icon: $IconLocation" -ForegroundColor Cyan
}
finally {
    if ($null -ne $wshShell) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wshShell) | Out-Null
    }
}
