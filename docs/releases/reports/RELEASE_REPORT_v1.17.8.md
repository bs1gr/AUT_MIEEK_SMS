# Release Report: v1.18.1

**Release Date:** 2026-02-11
**Release Type:** Minor (includes breaking frontend module relocation)
**Breaking Changes:** Yes (frontend import paths)
**Previous Version:** v1.18.1
**Repository:** bs1gr/AUT_MIEEK_SMS

---

## Executive Summary

Version v1.18.1 delivers a broad set of UX and reporting enhancements, quality-of-life improvements to operations and admin tooling, and a small but notable breaking change: the Power/System and RBAC permissions pages were moved into the feature module architecture. The legacy page wrappers remain for compatibility, but custom imports should be updated.

**Key Highlights:**
- 🧭 **Feature module alignment** for Power/System and RBAC permissions UI
- 📊 **Reporting & analytics UX improvements** (templates, exports, operations tiles)
- ✉️ **Custom report email overrides** and delivery enhancements
- 🧰 **Operations/control panel polish** (health + control unification)
- 🛠️ **Installer/uninstaller improvements** and cleanup tooling

---

## ⚠️ Breaking Changes

### Frontend Module Relocation

The following pages moved to feature modules:

| Legacy Import | New Import | Notes |
|---|---|---|
| `@/pages/PowerPage` | `@/features/operations` → `SystemPage` | Power/System page moved to Operations feature |
| `@/pages/AdminPermissionsPage` | `@/features/admin` → `PermissionsPage` | RBAC permissions page moved to Admin feature |

**Migration Guide:** `docs/guides/MIGRATION_v1.18.1.md`

---

## What’s Included

### Features
- Feedback inbox and Help PDF enhancements
- Reporting UX polish (template discovery tiles, CSV/analytics shortcuts)
- Custom reports email override support (UI + backend)
- Operations panel unification for health/control UI
- Historical edit recall enhancements for grades/attendance

### Fixes & Improvements
- Stabilized reporting builders and exports with better error feedback
- Translation coverage improvements across reports, RBAC, and search
- Control panel caching and UI consistency updates
- Installer/uninstaller reliability enhancements

### Maintenance & Cleanup
- Archived legacy logs and test artifacts
- Ignored generated SARIF/COMMIT_READY logs where appropriate
- Consolidated legacy script archives

---

## Impact Assessment

**End Users:**
- ✅ No workflow changes required
- ✅ Reporting UX improvements available immediately

**Developers/Integrators:**
- ⚠️ Update frontend import paths if you reference legacy Power/RBAC pages

**Operations:**
- ✅ Installer/uninstaller tooling improved
- ✅ Control panel UI consistency improved

---

## Validation & Testing

No additional test runs were executed as part of this documentation update. Refer to existing CI/CD and release validation artifacts for the v1.18.1 verification history.

---

## Files Added (This Documentation Update)

- `docs/guides/MIGRATION_v1.18.1.md`
- `docs/releases/reports/RELEASE_REPORT_v1.18.1.md`
- `docs/releases/reports/CLEANUP_EXECUTION_REPORT_v1.18.1.md`

---

## Quick Links

- **Release Notes:** `docs/releases/RELEASE_NOTES_v1.18.1.md`
- **Migration Guide:** `docs/guides/MIGRATION_v1.18.1.md`
- **Cleanup Report:** `docs/releases/reports/CLEANUP_EXECUTION_REPORT_v1.18.1.md`
- **Changelog:** `CHANGELOG.md`

---

*Release report prepared for v1.18.1 documentation alignment.*
