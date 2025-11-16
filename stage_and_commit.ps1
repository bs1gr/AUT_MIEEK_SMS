# PowerShell script to stage changes and create commit
# Run this in PowerShell: .\stage_and_commit.ps1

# Deactivate any active virtual environment
if ($env:VIRTUAL_ENV) {
    Write-Host "Deactivating virtual environment..." -ForegroundColor Yellow
    deactivate
}

Write-Host "Checking for node_modules backups to exclude..." -ForegroundColor Yellow

# Check if backup directories exist and warn user
if (Test-Path "frontend/node_modules.bak_*") {
    Write-Host "WARNING: Found node_modules backup directories!" -ForegroundColor Red
    Write-Host "These should NOT be committed. They will be ignored in staging." -ForegroundColor Red
    Write-Host "To delete them, run: Remove-Item -Recurse -Force 'frontend/node_modules.bak_*'" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Staging changes..." -ForegroundColor Green

# Stage backend changes
git add backend/services/
git add backend/routers/routers_analytics.py
git add backend/routers/routers_students.py
git add backend/main.py
git add backend/tests/test_analytics_router.py

# Stage frontend changes (exclude node_modules backups)
git add frontend/.npmrc
git add frontend/eslint.config.js
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/src/

# Stage configuration
git add student-management-system.code-workspace

# Stage documentation and config
git add .gitignore
git add CHANGELOG.md
git add CLEANUP_SUMMARY.md
git add NEXT_STEPS.md
git add stage_and_commit.ps1

Write-Host "`nShowing git status (excluding backups):" -ForegroundColor Yellow
git status --short | Where-Object { $_ -notmatch 'node_modules\.bak_' }

Write-Host "`nCreating commit..." -ForegroundColor Green

# Create commit with comprehensive message
git commit -m @"
feat: introduce service layer architecture and comprehensive analytics tests

Major architectural improvements:
- Added service layer (AnalyticsService, StudentService) to encapsulate business logic
- Refactored routers to use services for improved separation of concerns
- Added comprehensive analytics router tests (10 test cases)
- Implemented query optimization to prevent N+1 problems

Frontend improvements:
- Eliminated 41 'any' types across components
- Reduced TypeScript lint warnings from 312 to 254
- Added student profile sub-components
- Updated React Query to 5.62.11

Technical details documented in CHANGELOG.md and CLEANUP_SUMMARY.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

Write-Host "`nCommit created successfully!" -ForegroundColor Green
Write-Host "`nYou can now:" -ForegroundColor Cyan
Write-Host "  1. Review with: git log -1 --stat" -ForegroundColor White
Write-Host "  2. Push to remote: git push" -ForegroundColor White
