#!/usr/bin/env pwsh
# Quick commit script for terminal encoding fixes - Jan 13, 2026

Write-Host "`n=== Committing Terminal Encoding Fixes ===" -ForegroundColor Cyan

# Stage all changes
Write-Host "`nStaging files..." -ForegroundColor Yellow
git add .vscode/powershell-profile.ps1 `
    .vscode/settings.json `
    docs/TERMINAL_ENCODING_FIX.md `
    DOCUMENTATION_INDEX.md `
    TERMINAL_ENCODING_FIX_SUMMARY.md `
    commit_terminal_encoding_fix.ps1

# Show what's staged
Write-Host "`nStaged files:" -ForegroundColor Yellow
git status --short

# Commit
Write-Host "`nCreating commit..." -ForegroundColor Yellow
git commit -m @"
Fix terminal encoding corruption (ψ character) - Jan 13, 2026

Enhanced PowerShell profile with critical UTF-8 encoding setup:
- Set console encoding to UTF-8 FIRST before any operations
- Set code page 65001 (UTF-8) via safe chcp command
- Disable all progress bars and verbose output (corruption source)
- Configure environment variables for UTF-8 support
- Add clear feedback messages during profile initialization
- Improved error handling with try-catch blocks

Updated VS Code settings:
- Configure custom "PowerShell (SMS)" terminal profile
- Set as default terminal profile with auto-loaded encoding fix
- Added environment variables to VS Code terminal config
- Disabled GPU acceleration and shell integration (stability)
- Disabled persistent sessions (clean slate each time)

Created comprehensive documentation:
- docs/TERMINAL_ENCODING_FIX.md (complete guide)
- TERMINAL_ENCODING_FIX_SUMMARY.md (quick reference)
- Updated DOCUMENTATION_INDEX.md

Fixes: Terminal corruption preventing command execution
Related: Terminal encoding mismatch in VS Code PowerShell

To apply: Close all terminals, open new terminal (Ctrl+Shift+backtick)
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Commit successful!" -ForegroundColor Green
    git log --oneline -1
} else {
    Write-Host "`n✗ Commit failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
