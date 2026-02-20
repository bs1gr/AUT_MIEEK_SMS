# Release Notes v1.18.3 - RBAC Imports Scope Fix + Installer Refresh

**Date:** February 20, 2026
**Version:** v1.18.3
**Status:** Released
**Type:** Patch release

## 🎯 Overview

v1.18.3 is a focused patch release that stabilizes a legacy RBAC edge case for import permissions and republishes a fresh signed installer from corrected current lineage.

## 🐛 Fixes Included

### RBAC legacy fallback tightening
- Narrowed legacy admin fallback to `imports:*` permissions only.
- Prevents over-broad fallback behavior in strict RBAC scenarios.
- Keeps import flows operational for legacy/migrated permission states.

### Installer refresh
- Rebuilt and signed installer artifact for `v1.18.3`.
- Verified installer metadata and signature after build.

## 📦 Release Artifacts (prepared)

- `SMS_Installer_1.18.3.exe`
  - Size: `119232344` bytes
  - SHA256: `86fb67cdf39bc25c7e68a939c3194e01d35c9bdf86c8d719d0adba0c309c13c4`
- `SMS_Installer_1.18.3.exe.sha256`
  - Contains installer SHA256 sidecar line

## ✅ Validation Summary

- Installer build: successful
- Authenticode signature: valid
- File/Product version: `1.18.3`
- RBAC targeted tests (imports scope fallback): passing in prior validation run
- GitHub release published: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.3

## 🔄 Upgrade Notes

- No database migration required for this patch release.
- Recommended patch upgrade path: `v1.18.2` → `v1.18.3`.
- Deployment workflow remains unchanged:
  - Native testing: `NATIVE.ps1`
  - Production deployment: `DOCKER.ps1`
