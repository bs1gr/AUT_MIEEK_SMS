# Check CI/CD Status
Write-Host "=== Checking CI/CD Status ===" -ForegroundColor Cyan

# Check git status
Write-Host "`nCurrent Branch:" -ForegroundColor Green
cmd /c git branch --show-current 2>&1

Write-Host "`nRecent Commits:" -ForegroundColor Green
cmd /c git log --oneline -5 2>&1

Write-Host "`nUntracked Files:" -ForegroundColor Yellow
cmd /c git status --porcelain 2>&1

# Check if migrations are valid
Write-Host "`nChecking Alembic Migrations:" -ForegroundColor Green
cd backend
$py = "..\.venv\Scripts\python.exe"
& $py -m alembic current 2>&1
cd ..

Write-Host "`nCI/CD Status Check Complete" -ForegroundColor Cyan
