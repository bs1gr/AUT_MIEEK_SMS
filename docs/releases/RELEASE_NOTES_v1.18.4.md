# Release Notes v1.18.4

**Date:** February 23, 2026  
**Version:** v1.18.4  
**Type:** Patch / Stability & Security Hardening  
**Status:** Prepared (tag + publish pending)

## Overview

v1.18.4 consolidates post-v1.18.3 stability and security fixes across backup, control API authorization, RBAC behavior, and release hardening. This release is focused on safe operations and predictable installer publication.

## Included Changes (since v1.18.3)

### Security & Authorization

- Hardened control operations authorization coverage, including backup save-to-path flow (`require_control_admin`).
- Allowed admin bearer auth for backup/control operations in remote scenarios without weakening policy controls.
- Removed redundant backup shutdown-token field from DevTools UI to reduce confusion and security risk.

### Backup & Database Reliability

- Fixed SQLite WAL-mode backup handling to avoid empty/corrupted captures.
- Added idempotent migration for missing backup-related DB columns to prevent runtime 500 errors.
- Hardened sqlite-to-postgres migration helper behavior for release/runtime edge cases.

### RBAC & Test Reliability

- Added RBAC test enforcement fix by using `AUTH_MODE=permissive` in targeted enforcement setup.
- Added/updated RBAC panel behavior and test coverage for role management scenarios.

### Frontend/Backend Stability

- Fixed DevTools theme token usage (`theme.primaryButton` → `theme.button`).
- Added missing backend logger import in control operations path.
- Added restore-from-server backup UX flow in DevTools panel.

### Release Automation & Governance

- Release lineage safeguards kept active (`v1.x.x`, default-branch ancestry, current-tag dispatch policy).
- Installer workflow gates enforced: mandatory signing gate, payload minimum floor, SHA256 digest verification.
- Asset sanitizer enforces installer-only allowlist:
  - `SMS_Installer_<version>.exe`
  - `SMS_Installer_<version>.exe.sha256`

## Validation Summary

- Commit history reviewed and curated from `v1.18.3..HEAD`.
- Release workflows reviewed:
  - `.github/workflows/release-on-tag.yml`
  - `.github/workflows/release-installer-with-sha.yml`
  - `.github/workflows/release-asset-sanitizer.yml`
- Version metadata synced for release prep:
  - `VERSION` = `1.18.4`
  - `frontend/package.json` = `1.18.4`
  - `CHANGELOG.md` includes finalized `[1.18.4]` section.

## Release Artifacts (expected)

- `SMS_Installer_1.18.4.exe`
- `SMS_Installer_1.18.4.exe.sha256`

> Final size/hash/signature values are populated by release workflow outputs after tag publish.

## Publish Procedure

1. Create and push tag `v1.18.4` from `main`.
2. Let `release-on-tag.yml` create/update release body and dispatch installer workflow.
3. Verify installer upload + SHA256 sidecar + final sanitizer allowlist gate.
4. Confirm release assets and digest integrity on GitHub release page.
