# Script to fix stuck git rebase state
Set-Location "d:\SMS\student-management-system"

# Set git editor to skip interactive prompts
$env:GIT_EDITOR = "true"

# Remove rebase state
$rebaseMergeDir = ".git\rebase-merge"
if (Test-Path $rebaseMergeDir) {
    Remove-Item $rebaseMergeDir -Recurse -Force
    Write-Host "✓ Removed rebase state directory"
}

# Remove other rebase artifacts
$rebaseFiles = @(".git\REBASE_HEAD", ".git\MERGE_MSG", ".git\AUTO_MERGE")
foreach ($file in $rebaseFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✓ Removed $file"
    }
}

# Reset HEAD to origin/main
Set-Content -Path ".git\HEAD" -Value "ref: refs/heads/main" -NoNewline
Write-Host "✓ Reset HEAD to main branch"

# Get current status
Write-Host "`nCurrent git status:"
git status

Write-Host "`nLocal commits:"
git log --oneline origin/main..HEAD

Write-Host "`n✓ Git state cleaned successfully"
