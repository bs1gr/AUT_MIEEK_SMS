# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog principles and uses semantic versioning.

## [Unreleased]

## [1.2.2] - 2025-10-31

Bug Fixes:

- **Theme Application in Edge Browser**: Enhanced ThemeContext and early theme detection script with Edge-specific compatibility fixes, added force repaint after class changes
- **OpenAPI Schema Version**: Fixed version mismatch (3.0.3 → 1.2.1) causing parser errors at /docs endpoint, added redoc_url
- **Developer Tools API Endpoints**: Corrected API routes - reset endpoint now uses `/adminops/clear`, backup uses `/adminops/backup`
- **Control Panel Environment Info**: Enhanced version display with comprehensive package information (FastAPI, SQLAlchemy, Pydantic, Uvicorn) and descriptive tooltips

Technical:

- Updated backend/main.py FastAPI version to match VERSION file
- Improved frontend theme detection for Microsoft Edge browser compatibility
- Fixed DevTools component to use correct adminops API endpoints

## [1.2.1] - 2025-10-31

**Major Installation Overhaul - Simplified to ONE Command**

Breaking Changes:

- Removed all PowerShell-based installers (QUICKSTART.ps1, SMART_SETUP.ps1, ONE-CLICK.ps1)
- Removed legacy .bat wrappers (QUICKSTART.bat, START.bat, ONE-CLICK.bat)
- Removed overcomplicated troubleshooting infrastructure

New Simple Installation:

- `INSTALL.bat` - Pure CMD installer, works on any Windows without prerequisites
- `install.py` - Universal Python-based installer (cross-platform)
- `INSTALL.md` - Dead-simple one-page installation guide

Key Improvements:

- No more PowerShell execution policy issues
- Auto-detection of Docker/Python/Node.js
- Single-command installation experience
- Clear error messages with download links

User Experience Changes:

- Before: Download → Configure system → Run multiple scripts → Debug issues
- After: Download → Run INSTALL.bat → Application opens automatically

Files Removed (11 total):

- QUICKSTART.ps1, QUICKSTART.bat (replaced by INSTALL.bat)
- SMART_SETUP.ps1 (functionality integrated into install.py)
- ONE-CLICK.ps1, ONE-CLICK.bat (replaced by INSTALL.bat)
- START.bat (unnecessary with new installer)
- VALIDATE_SETUP.ps1, TROUBLESHOOTING.md, GETTING_STARTED.md (overcomplicated)
- QUICK_DEPLOYMENT.md, DEPRECATIONS.md (redundant documentation)

Files Kept:

- SMS.ps1 (management interface - start/stop/status/diagnostics)
- All core application files and documentation

Migration Guide:

- Old: `.\QUICKSTART.ps1` → New: `INSTALL.bat` or `python install.py`
- Old: `.\SMART_SETUP.ps1` → New: `INSTALL.bat` or `python install.py`
- Old: `.\START.bat` → New: `SMS.ps1` (for management only, INSTALL.bat for first-time setup)

Docs/UX:

- Added deprecation notice for legacy wrappers in README: START.bat and ONE-CLICK.ps1/ONE-CLICK.bat now forward to primary scripts.
- Recommended entry points clarified: use QUICKSTART.ps1 (start) and SMS.ps1 (management). ONE-CLICK.ps1 forwards to SMART_SETUP.ps1.

## [1.2.0] - 2025-10-30

Highlights:

- Optional JWT authentication with RBAC (feature-flagged via AUTH_ENABLED)
- Timezone-aware timestamps across models (UTC) with Alembic migration
- Rate limiting enforced on new write endpoints
- Fresh-clone deployment validated and documented

Docs:

- Detailed release notes: docs/RELEASE_NOTES_v1.2.md
- Fresh clone test report: FRESH_CLONE_TEST_REPORT_V1.2.md
- Authentication guide: docs/AUTHENTICATION.md (if present in docs/, else see README references)

Migrations:

- Auto-applied on startup; see backend/run_migrations.py

## [1.1.0] - 2025-XX-XX

Highlights:

- Stability improvements and documentation updates

Docs:

- Detailed release notes: docs/RELEASE_NOTES_v1.1.md

---

Unreleased changes will be added above as they land in main.

[1.2.2]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.2
[1.2.1]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.1
[1.2.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.0
[1.1.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.1.0
[Unreleased]: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.2.2...HEAD
