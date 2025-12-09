<#
.SYNOPSIS
    Create Desktop Shortcut for SMS Docker Toggle

.DESCRIPTION
    Creates a Windows shortcut on the Desktop that toggles the SMS application.
    - First click: Starts SMS if stopped
    - Second click: Stops SMS if running
    
    The shortcut uses PowerShell to execute DOCKER_TOGGLE.ps1

.NOTES
    Version: 1.0.0
    Run this script once to create the shortcut
#>

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SMS Desktop Shortcut Creator" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    # Get paths
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $toggleScript = Join-Path $scriptDir "DOCKER_TOGGLE.vbs"
    $iconPath = Join-Path $scriptDir "SMS_Toggle.ico"
    $shortcutPath = Join-Path $desktopPath "SMS Toggle.lnk"
    
    # Verify DOCKER_TOGGLE.vbs exists
    if (-not (Test-Path $toggleScript)) {
        Write-Host "❌ Error: DOCKER_TOGGLE.vbs not found at:" -ForegroundColor Red
        Write-Host "   $toggleScript" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please ensure DOCKER_TOGGLE.vbs exists in the same directory." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "ℹ️  Creating shortcut..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Script:   $toggleScript" -ForegroundColor White
    Write-Host "  Shortcut: $shortcutPath" -ForegroundColor White
    Write-Host "  Type:     VBS (Universal - No PowerShell issues)" -ForegroundColor Green
    Write-Host ""
    
    # Create WScript Shell COM object
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Check if shortcut already exists
    if (Test-Path $shortcutPath) {
        $response = Read-Host "Shortcut already exists. Overwrite? (Y/n)"
        if ($response -match '^[Nn]') {
            Write-Host "✅ Cancelled - existing shortcut preserved" -ForegroundColor Green
            exit 0
        }
        Remove-Item $shortcutPath -Force
    }
    
    # Create shortcut
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$toggleScript`""
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.Description = "Toggle SMS Docker Application (Start/Stop) - VBS Version"
    
    # Use custom icon if available, otherwise fallback to shell32.dll
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = $iconPath
    } else {
        $shortcut.IconLocation = "shell32.dll,21"  # Computer icon fallback
    }
    
    $shortcut.Save()
    
    Write-Host "✅ Shortcut created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  🎉 Setup Complete!" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "  • Double-click 'SMS Toggle' on your Desktop to START SMS" -ForegroundColor White
    Write-Host "  • Double-click again to STOP SMS" -ForegroundColor White
    Write-Host ""
    Write-Host "The shortcut will:" -ForegroundColor Yellow
    Write-Host "  ✓ Start SMS if it's currently stopped" -ForegroundColor White
    Write-Host "  ✓ Stop SMS if it's currently running" -ForegroundColor White
    Write-Host "  ✓ Show popup messages (no console windows!)" -ForegroundColor White
    Write-Host "  ✓ Work on all Windows versions" -ForegroundColor White
    Write-Host "  ✓ No PowerShell execution policy issues" -ForegroundColor White
    Write-Host ""
    
    # Offer to test
    $test = Read-Host "Would you like to test the shortcut now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($test) -or $test -match '^[Yy]') {
        Write-Host ""
        Write-Host "Launching shortcut..." -ForegroundColor Cyan
        Start-Process $shortcutPath
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Error creating shortcut:" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
