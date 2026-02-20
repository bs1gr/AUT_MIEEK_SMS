# Release Notes v1.18.2 - Installer Runtime Hotfix & Release Hardening

**Date:** February 20, 2026
**Version:** v1.18.2
**Status:** Released
**Type:** Patch release

## 🎯 Overview

v1.18.2 is a focused hotfix release to address a Windows installer runtime failure and to publish a corrected, signed installer from current lineage.

## 🐛 Fixes Included

### Installer runtime hotfix
- Addressed installer behavior that produced runtime failure during setup flow (reported from production installer usage).
- Released from corrected lineage (`v1.18.2`) to avoid immutable legacy-tag workflow behavior.

### Release workflow hardening (already validated before this tag)
- Enforced lineage and signing gates in release automation.
- Enforced installer-only release assets (`.exe` + `.sha256`).
- Added post-upload digest verification and payload guard checks.

## 📦 Published Release Artifacts

- `SMS_Installer_1.18.2.exe`
  - Size: `26,115,744` bytes
  - SHA256: `1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`
- `SMS_Installer_1.18.2.exe.sha256`
  - Contains installer SHA256: `1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`

Release URL: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.2

## ✅ Validation Summary

- Release published and non-draft.
- Installer and hash sidecar present.
- Release automation completed with signature/integrity gate coverage.

## 🔄 Upgrade Notes

- No database migration required for this patch release.
- Recommended upgrade path: `v1.18.1` → `v1.18.2`.
- Existing deployment workflow remains unchanged:
  - Native testing: `NATIVE.ps1`
  - Production deployment: `DOCKER.ps1`

---

**Commit anchor:** `802a656ab` (`hotfix(release): bump to 1.18.2 for installer runtime crash fix`)
