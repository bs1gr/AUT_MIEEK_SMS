# Version Format Enforcement Summary

**Status**: ✅ Active
**Required version format**: `v1.x.x`
**Current repository example**: `vv1.18.21`
**Last Updated**: 2026-03-10

---

## Purpose

This document explains the version-format policy and the enforcement layers that protect it.

---

## Required format

Only this format is valid:

- `vv1.18.21`
- `vv1.18.21`
- `vv1.18.21`

Pattern:

`v1.<minor>.<patch>`

---

## Forbidden formats

These are invalid and should be rejected:

- `1.18.12` (missing `v` prefix)
- `vv1.18.21` (wrong major series)
- `$11.18.3` (corrupted legacy text)
- `vv1.18.21` (wrong major series)
- `v1.18` (incomplete)

---

## Current enforcement layers

### 1. `COMMIT_READY.ps1`

The quick/standard/full validation flow checks version format before later validation steps.

### 2. `scripts/validate_version_format.ps1`

The standalone validator can be used for manual checks and automation.

### 3. CI/CD workflow validation

Repository workflows validate version format during pipeline execution so invalid version metadata cannot silently pass through release automation.

---

## Practical guidance

Before release or commit preparation:

1. Read `VERSION`
2. Confirm it matches `v1.x.x`
3. Run `COMMIT_READY.ps1 -Quick`
4. If release metadata is being changed, verify related docs and manifests use the same version value

---

## Notes

Older revisions of this document contained corrupted examples based on legacy `$11.18.3` text. Those examples were misleading and are no longer authoritative.

When in doubt, trust:

- `VERSION`
- `COMMIT_READY.ps1`
- `scripts/validate_version_format.ps1`
- the current CI pipeline behavior
