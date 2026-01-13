#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Commit terminal encoding fixes (Jan 13, 2026)
.DESCRIPTION
    Commits the PowerShell profile and VS Code settings updates
    that fix the terminal encoding corruption (ψ character issue)
#>

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Committing Terminal Encoding Fixes (v2)   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$files = @(
    ".vscode/powershell-profile.ps1",
    ".vscode/settings.json",
    "docs/TERMINAL_ENCODING_FIX.md",
    "DOCUMENTATION_INDEX.md"
)

Write-Host "Files to commit:" -ForegroundColor Yellow
$files | ForEach-Object { Write-Host "  • $_" -ForegroundColor Gray }

Write-Host ""

# Add files
Write-Host "Staging files..." -ForegroundColor Cyan
git add $files

# Commit
Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m @"
Fix terminal encoding corruption (ψ character) - Jan 13, 2026

Enhanced PowerShell profile with critical UTF-8 encoding setup:
- Set console encoding to UTF-8 FIRST before any operations
- Set code page 65001 (UTF-8) via safe chcp command
- Disable all progress bars and verbose output (corruption source)
- Configure environment variables for UTF-8 (PYTHONIOENCODING, TERM, GIT_TERMINAL_PROMPT)
- Add clear feedback messages during profile initialization
- Improved error handling with try-catch blocks

Updated VS Code settings:
- Configure custom "PowerShell (SMS)" terminal profile
- Set as default terminal profile with auto-loaded encoding fix
- Added environment variables for UTF-8 support
- Disabled GPU acceleration and shell integration (stability)
- Disabled persistent sessions (clean slate each time)

Created comprehensive documentation:
- docs/TERMINAL_ENCODING_FIX.md (problem, solution, verification, troubleshooting)
- Updated DOCUMENTATION_INDEX.md with reference

How to apply:
1. Close all VS Code terminals (reload needed)
2. Open new terminal (Ctrl+Shift+backtick)
3. New terminal will auto-load UTF-8 profile
4. ψ character corruption should be fixed

Fixes: Terminal corruption preventing command execution
Related: Terminal encoding mismatch in VS Code PowerShell
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Commit successful!" -ForegroundColor Green

    # Show commit
    Write-Host "`nCommit details:" -ForegroundColor Cyan
    git log --oneline -1

    Write-Host "`nPushing to origin..." -ForegroundColor Cyan
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Push successful!" -ForegroundColor Green
        Write-Host "`nTerminal encoding fix is now committed and pushed." -ForegroundColor Green
        Write-Host "Restart VS Code or reload terminals to apply the fix." -ForegroundColor Yellow
    } else {
        Write-Host "`n⚠ Push failed - please check connection" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n✗ Commit failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
