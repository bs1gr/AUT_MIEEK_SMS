# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog principles and uses semantic versioning.

## [Unreleased]

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

[1.2.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.0
[1.1.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.1.0
[Unreleased]: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.2.0...HEAD
