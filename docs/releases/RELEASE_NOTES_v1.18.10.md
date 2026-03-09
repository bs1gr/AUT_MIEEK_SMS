# Release Notes - Version 1.18.10

**Release Date**: 2026-03-09
**Previous Version**: v1.18.9
**Release Type**: Patch Release

## Summary

Version 1.18.10 packages the post-v1.18.9 installer patch work into a clean release lineage. The focus is preserving existing PostgreSQL profile settings during upgrades, avoiding silent fallback to local SQLite, and shipping a refreshed installer artifact that matches the corrected upgrade behavior.

## 🔧 Installer & Upgrade Reliability

- Preserved existing PostgreSQL-related configuration during upgrades instead of overwriting profile intent.
- Prevented upgrade profile drift that could silently switch a remote PostgreSQL installation back to local SQLite.
- Refreshed installer metadata and versioned installer documentation for the new patch release.
- Removed stale installer lineage references from the tracked installer bundle.

## 🐳 Runtime / Environment Handling

- Updated `DOCKER.ps1` to infer and preserve valid remote PostgreSQL profile settings when `DATABASE_ENGINE` / `DATABASE_URL` already indicate a remote deployment.
- Added recovery helper `scripts/ops/REPAIR_LAPTOP_ENV_PROFILE.ps1` for field repair of affected laptop environments.

## 🧹 Repository Maintenance Since v1.18.9

- Archived deprecated scripts and lint report artifacts.
- Added test runner guidance and workspace cleanup session documentation.
- Normalized minor release-note and CSV formatting drift.

## ✅ Verification Scope

- Release/tag lineage reviewed: `v1.18.9..HEAD`
- Post-release commits reviewed: 5
- Confirmed that prior installer rebuild commit was **not** inside `v1.18.9` tag lineage
- Version metadata updated for `v1.18.10` release preparation

## Commits in Scope

- `500147165` — `build(installer): rebuild v1.18.9 installer with profile-drift fix and updated docs`
- `471a3dd30` — `fix(installer): preserve postgres profile on upgrade and add env repair helper`
- `68f3bffd9` — `docs: add test runners guide and workspace cleanup session summary`
- `2b03d6a06` — `chore: archive deprecated scripts and lint reports to archive/`
- `d555722b4` — `style(docs): fix release notes formatting and CSV newlines for v1.18.9`
