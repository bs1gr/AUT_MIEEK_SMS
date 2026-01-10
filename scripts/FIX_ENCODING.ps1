# Fix PowerShell Encoding Issues (Greek DOS → UTF-8)
# Run this script once to permanently fix the ψ character issue in VS Code terminal

$profilePath = $PROFILE
Write-Host "PowerShell Profile: $profilePath" -ForegroundColor Cyan

# Ensure profile directory exists
$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "✓ Created profile directory" -ForegroundColor Green
}

# Backup existing profile if it exists
if (Test-Path $profilePath) {
    $backup = "$profilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $profilePath $backup
    Write-Host "✓ Backed up existing profile to: $backup" -ForegroundColor Green
}

# UTF-8 encoding fix (add to top of profile)
$encodingFix = @'
# Fix encoding for VS Code terminal (prevents Greek character ψ corruption)
if ($host.Name -eq 'ConsoleHost' -or $env:TERM_PROGRAM -eq 'vscode') {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 | Out-Null
}

'@

# Read existing profile content
$existingContent = if (Test-Path $profilePath) {
    Get-Content $profilePath -Raw
} else {
    ""
}

# Only add if not already present
if ($existingContent -notmatch "Fix encoding for VS Code") {
    $newContent = $encodingFix + $existingContent
    Set-Content -Path $profilePath -Value $newContent -Encoding UTF8
    Write-Host "✓ Added encoding fix to PowerShell profile" -ForegroundColor Green
} else {
    Write-Host "✓ Encoding fix already present in profile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Fix Applied Successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Close ALL PowerShell terminals in VS Code" -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+P → 'Reload Window'" -ForegroundColor White
Write-Host "3. Open a new terminal (Ctrl+`)" -ForegroundColor White
Write-Host "4. Test with: git status" -ForegroundColor White
Write-Host ""
Write-Host "The ψ character should no longer appear!" -ForegroundColor Green
