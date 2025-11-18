# commit-changes.ps1
# Git commit script for session changes

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== Staging Changes ===" -ForegroundColor Cyan

# Stage all modified and new files
git add -A

# Show what will be committed
Write-Host "`n=== Files to be committed ===" -ForegroundColor Cyan
git status --short

# Create commit message
$commitMessage = @"
feat: add comprehensive monitoring stack and system improvements

## Monitoring & Alerting
- Add complete monitoring stack (Prometheus, Grafana, Loki, AlertManager)
- Implement 50+ application metrics collection
- Create 23 alert rules (critical, warning, info)
- Add pre-built Grafana dashboard
- Integrate monitoring into SMS.ps1, SMART_SETUP.ps1, RUN.ps1

## pip Version Management
- Enforce pip 25.3 in virtual environments
- Add automatic pip upgrade in SMART_SETUP.ps1
- Create helper script: scripts/dev/upgrade-pip.ps1

## Localization Fixes
- Fix typo in controlPanel.js translation key
- Remove duplicate keys in export.js (EN/EL)
- Verify 950+ translation keys across all modules

## Documentation
- Add comprehensive monitoring guides (6 new docs)
- Create native mode monitoring guide
- Document pip version management
- Add localization quality report
- Create session changelog

## New Features
- Monitoring stack with Docker Compose
- Hybrid mode (native app + Docker monitoring)
- Metrics-only mode for native development
- PowerShell monitoring commands

## Files Added (23)
- docker-compose.monitoring.yml
- backend/middleware/prometheus_metrics.py
- monitoring/ (10 config files)
- docs/ (10 documentation files)
- scripts/dev/upgrade-pip.ps1
- CHANGELOG_SESSION_2025-01-18.md

## Files Modified (8)
- backend/main.py, requirements.txt
- frontend/src/locales/*/controlPanel.js, export.js
- SMS.ps1, SMART_SETUP.ps1, RUN.ps1
- MONITORING_QUICKSTART.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

# Commit
Write-Host "`n=== Creating Commit ===" -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Commit created successfully!" -ForegroundColor Green

    # Show commit
    Write-Host "`n=== Commit Details ===" -ForegroundColor Cyan
    git log -1 --stat

    Write-Host "`n=== Ready to Push ===" -ForegroundColor Yellow
    Write-Host "Run: git push" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ Commit failed" -ForegroundColor Red
    exit 1
}
