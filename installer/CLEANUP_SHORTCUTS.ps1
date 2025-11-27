#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Cleans up redundant SMS shortcuts from previous installations.

.DESCRIPTION
    Removes old "SMS Toggle" shortcuts and duplicate shortcuts,
    keeping only the correct "Student Management System" shortcut.

.EXAMPLE
    .\CLEANUP_SHORTCUTS.ps1
    Removes redundant shortcuts.
#>

$ErrorActionPreference = "Continue"

Write-Host "`n╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SMS Shortcut Cleanup Utility                                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ShortcutsToRemove = @(
    # Old "SMS Toggle" shortcuts
    "$([Environment]::GetFolderPath('Desktop'))\SMS Toggle.lnk",
    "$([Environment]::GetFolderPath('CommonDesktop'))\SMS Toggle.lnk",
    
    # Manual folder shortcuts
    "$([Environment]::GetFolderPath('Desktop'))\student-management-system - Shortcut.lnk",
    
    # Duplicate shortcuts in wrong locations
    "$([Environment]::GetFolderPath('CommonDesktop'))\Student Management System.lnk"
)

$Removed = 0
$NotFound = 0

Write-Host "🔍 Scanning for redundant shortcuts...`n" -ForegroundColor Yellow

foreach ($shortcut in $ShortcutsToRemove) {
    if (Test-Path $shortcut) {
        try {
            Remove-Item $shortcut -Force
            Write-Host "  ✅ Removed: $(Split-Path -Leaf $shortcut)" -ForegroundColor Green
            $Removed++
        }
        catch {
            Write-Host "  ❌ Failed to remove: $(Split-Path -Leaf $shortcut)" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
    else {
        $NotFound++
    }
}

Write-Host "`n╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Cleanup Summary                                                     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "  Removed:   $Removed shortcut(s)" -ForegroundColor White
Write-Host "  Not Found: $NotFound shortcut(s)" -ForegroundColor Gray

Write-Host "`n✅ Correct Shortcuts (Should Remain):" -ForegroundColor Green
$CorrectShortcuts = @(
    "$([Environment]::GetFolderPath('Desktop'))\Student Management System.lnk",
    "$([Environment]::GetFolderPath('CommonPrograms'))\Student Management System\Student Management System.lnk",
    "$([Environment]::GetFolderPath('CommonPrograms'))\Student Management System\SMS Documentation.lnk",
    "$([Environment]::GetFolderPath('CommonPrograms'))\Student Management System\Uninstall Student Management System.lnk"
)

foreach ($shortcut in $CorrectShortcuts) {
    if (Test-Path $shortcut) {
        Write-Host "  ✅ $(Split-Path -Leaf $shortcut)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Cleanup Complete!" -ForegroundColor Green
Write-Host ""
