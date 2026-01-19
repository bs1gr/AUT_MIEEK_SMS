Write-Host "Pushing changes to remote repository..." -ForegroundColor Cyan

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes pushed successfully." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push changes." -ForegroundColor Red
    exit 1
}
