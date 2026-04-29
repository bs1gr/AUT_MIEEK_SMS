# Release Manifest - Version 1.18.13

**Release Date (target)**: March 17, 2026
**Tag**: vv1.18.21
**Branch**: main
**Previous Tag**: vv1.18.21

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.13.exe` | Windows installer (Inno Setup) |

### Asset Allowlist (Installer-only policy)

Only the following asset is permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`

GitHub release digest metadata is the authoritative SHA256 source for this release line.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `vv1.18.21` |
| `frontend/package.json` | `"version": "1.18.13"` |
| `backend/main.py` | `Version: 1.18.13` |
| `INSTALLER_BUILDER.ps1` | `Version: 1.18.13` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.13` |
| `CHANGELOG.md` | post-`vv1.18.21` Unreleased summary present |

---

## 📋 Commit Range

**Base Tag**: vv1.18.21
**Head Commit (prep start)**: `0d65f157c`

### Scope Evidence

- Commits reviewed: `34`
- Files changed: `192`
- Diff footprint: `6057 insertions`, `5620 deletions`

### High-impact Areas

- Custom reports pipeline hardening (grouping, GPA, export/data fixes)
- Native startup reliability hardening
- Backup-path and metadata security tightening
- QNAP PostgreSQL-only deployment hardening
- Script/workflow consolidation for test runners and legacy tooling

---

## ✅ Validation Gates

### Pre-Release Gates

- [x] Version metadata aligned to `vv1.18.21`
- [x] Release notes generated (`RELEASE_NOTES`, `GITHUB_RELEASE`, `.github/RELEASE_NOTES`)
- [x] `scripts/VERIFY_VERSION.ps1 -CheckOnly` passed
- [x] `COMMIT_READY.ps1 -Quick -Snapshot` passed (`artifacts/state/STATE_2026-03-17_095642.md`)
- [x] Scope-appropriate tests completed and reviewed (`RUN_TESTS_BATCH.ps1`: 21/21 batches passed; frontend quick Vitest pass)
- [x] Local installer build/sign/smoke verification completed (`SMS_Installer_1.18.13.exe`)

### Local Installer Evidence

- File: `dist/SMS_Installer_1.18.13.exe`
- Signature status: `Valid`
- Signer: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
- SHA256: `E1D41BC9C25E1D4B0DABC53B25F25D83381604BD8576660645DA1E71B148D872`

### Publication Gates

- [ ] Tag `vv1.18.21` created and pushed
- [ ] `Create GitHub Release on tag` workflow succeeds
- [ ] `Release - Build & Upload Installer with SHA256` workflow succeeds
- [ ] `Release Asset Sanitizer` workflow succeeds
- [ ] Release page contains only installer allowlisted assets
- [ ] Digest metadata visible for installer asset
