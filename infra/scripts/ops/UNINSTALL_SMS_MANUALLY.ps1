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

# Stop/remove production runtime containers first (prevents image-in-use failures)
Write-Host "Stopping/removing SMS runtime containers..." -ForegroundColor Yellow

$appFolder = 'C:\Program Files\SMS'

$composeBase = Join-Path $appFolder 'docker\docker-compose.yml'
$composeProd = Join-Path $appFolder 'docker\docker-compose.prod.yml'
$rootEnv = Join-Path $appFolder '.env'

if ((Test-Path $composeBase) -and (Test-Path $composeProd)) {
    if (Test-Path $rootEnv) {
        docker compose --env-file "$rootEnv" -f "$composeBase" -f "$composeProd" down --remove-orphans 2>$null | Out-Null
    } else {
        docker compose -f "$composeBase" -f "$composeProd" down --remove-orphans 2>$null | Out-Null
    }
}

# Single-image mode and managed postgres containers
docker stop sms-app 2>$null | Out-Null
docker rm -f sms-app 2>$null | Out-Null
docker stop sms-postgres 2>$null | Out-Null
docker rm -f sms-postgres 2>$null | Out-Null
docker rm -f sms-db-backup 2>$null | Out-Null
docker rm -f sms-redis 2>$null | Out-Null

# Safety pass: remove any remaining sms-* containers from legacy/custom runs
$smsResidualContainers = docker ps -aq --filter "name=^sms-" 2>$null
if ($smsResidualContainers) {
    docker rm -f $smsResidualContainers 2>$null | Out-Null
}

Write-Host "✓ Runtime container teardown commands executed" -ForegroundColor Green

# Ask if user wants to remove Docker images as well
Write-Host ""
$removeImage = Read-Host "Do you want to remove Docker images as well (sms-fullstack + postgres)? (y/N)"
if ($removeImage -eq 'y' -or $removeImage -eq 'Y') {
    Write-Host "Removing production Docker images..." -ForegroundColor Yellow
    $imagesToRemove = @(
        'sms-fullstack',
        'sms-fullstack:latest',
        'postgres',
        'postgres:latest',
        'postgres:16',
        'postgres:16-alpine'
    )

    foreach ($image in $imagesToRemove) {
        docker image rm -f $image 2>$null | Out-Null
    }

    # Safety pass: remove any remaining tags for target repositories
    $dynamicImageRefs = docker images --format '{{.Repository}}:{{.Tag}}' 2>$null |
        Where-Object { $_ -match '^(sms-fullstack|postgres):' }
    foreach ($imageRef in $dynamicImageRefs) {
        docker image rm -f $imageRef 2>$null | Out-Null
    }

    Write-Host "✓ Production Docker image removal commands executed" -ForegroundColor Green
    Write-Host "Note: This can free significant disk space" -ForegroundColor Cyan
} else {
    Write-Host "✓ Docker images kept (can be reused for reinstall)" -ForegroundColor Gray
}

# Remove application folder
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
