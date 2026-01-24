#!/usr/bin/env pwsh
# Simple script to commit PowerShell profile fix

[System.Console]::ResetColor()
Clear-Host
Write-Host "Committing PowerShell profile improvements..." -ForegroundColor Cyan

# Navigate to repo
Set-Location -Path "d:\SMS\student-management-system"

# Show current status
$status = & git status --porcelain
if ($status) {
    Write-Host "Uncommitted changes found:" -ForegroundColor Yellow
    Write-Host $status

    # Stage and commit
    & git add .vscode/powershell-profile.ps1
    & git commit -m "Improve PowerShell profile - more aggressive terminal cleanup for ψ character prevention

- Disable all progress, verbose, debug preferences at startup
- Add console reset and clear-host on profile load
- Set TERM=dumb to disable fancy terminal features
- Simplify prompt to 'PS > ' (avoid path which can include special chars)
- Add Ctrl+V binding for clean paste
- Suppress git and terminal feature codes

This ensures terminal environment is clean even if VS Code terminal state is corrupted."

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit successful!" -ForegroundColor Green

        # Push to origin
        & git push origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Push successful!" -ForegroundColor Green
        } else {
            Write-Host "Push failed" -ForegroundColor Red
        }
    } else {
        Write-Host "Commit failed" -ForegroundColor Red
    }
} else {
    Write-Host "No uncommitted changes" -ForegroundColor Green
}
