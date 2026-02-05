# MANUAL SMS UNINSTALLER (for broken installations)
# Run this as Administrator to remove SMS when Windows Settings uninstall fails

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Manual SMS Uninstaller - Removing Broken Installation      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must run as Administrator" -ForegroundColor Red
    Write-Host "Right-click → Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# Stop Docker container if running
Write-Host "Stopping SMS Docker container..." -ForegroundColor Yellow
docker stop sms-app 2>$null
docker rm sms-app 2>$null
Write-Host "✓ Docker container stopped" -ForegroundColor Green

# Remove application folder
$appFolder = 'C:\Program Files\SMS'
if (Test-Path $appFolder) {
    Write-Host "`nRemoving folder: $appFolder" -ForegroundColor Yellow
    try {
        Remove-Item -Path $appFolder -Recurse -Force -ErrorAction Stop
        Write-Host "✓ Folder removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not remove folder (files may be locked): $_" -ForegroundColor Red
    }
} else {
    Write-Host "`nFolder not found: $appFolder" -ForegroundColor Gray
}

# Remove registry entries (both HKLM and HKCU)
Write-Host "`nRemoving registry entries..." -ForegroundColor Yellow
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}_is1',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}_is1'
)

foreach ($regPath in $regPaths) {
    if (Test-Path $regPath) {
        try {
            Remove-Item -Path $regPath -Recurse -Force -ErrorAction Stop
            Write-Host "✓ Removed: $regPath" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Could not remove: $regPath - $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Not found: $regPath" -ForegroundColor Gray
    }
}

# Remove Start Menu shortcuts
$startMenuPaths = @(
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Student Management System",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Student Management System"
)

Write-Host "`nRemoving Start Menu shortcuts..." -ForegroundColor Yellow
foreach ($path in $startMenuPaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Removed: $path" -ForegroundColor Green
    }
}

# Remove Desktop shortcut
$desktopShortcut = "$env:PUBLIC\Desktop\Student Management System.lnk"
if (Test-Path $desktopShortcut) {
    Remove-Item -Path $desktopShortcut -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed desktop shortcut" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         ✅ Old SMS installation completely removed!           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can install the new version:" -ForegroundColor Cyan
Write-Host "  D:\SMS\student-management-system\dist\SMS_Installer_1.17.7.exe" -ForegroundColor Yellow
Write-Host ""
pause
