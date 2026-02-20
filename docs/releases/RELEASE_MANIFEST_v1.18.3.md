# Release Manifest - v1.18.3

**Version:** 1.18.3
**Date:** February 20, 2026
**Type:** Patch release
**Status:** Prepared (pending tag + GitHub release publish)

## Release Metadata

- Tag: `v1.18.3`
- Release: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.3` (pending publish)
- Branch lineage: `main`

## Artifacts

### Required assets (prepared)
- [x] `SMS_Installer_1.18.3.exe`
  - size: `119231568` bytes
  - digest: `sha256:c6f8eb7e0c84faa97ae049de3c81d2c967ca54880f6c7b52afa7fa3ec88c382c`
- [x] `SMS_Installer_1.18.3.exe.sha256`
  - digest source: generated from installer artifact in `dist/`

## Scope Summary

- RBAC patch: fallback narrowed to `imports:*` only for legacy permission edge cases.
- Installer artifact refreshed and signed for `v1.18.3` release lineage.

## Key Commits in Scope

- `13e5eb57f` - fix(rbac): allow legacy admin fallback only for imports permissions
- `<pending>` - release(v1.18.3): bump versions, refresh installer, add release docs

## Policy Gates

- [x] Version bumped to `1.18.3` in `VERSION` and frontend package
- [x] Installer built and signed
- [x] Installer SHA256 generated and recorded
- [ ] Tag created and pushed (`v1.18.3`)
- [ ] GitHub release published (non-draft)
- [ ] Release asset allowlist confirmed on published release

---

**Owner decision mode:** Solo developer patch-release approval.
