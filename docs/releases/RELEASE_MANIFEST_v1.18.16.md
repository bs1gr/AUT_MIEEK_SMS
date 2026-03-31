# Release Manifest - v1.18.16

**Version**: 1.18.16
**Release Date**: 2026-03-31
**Prepared By**: Solo Developer + AI Assistant
**Status**: ✅ PREPARED - local validation and commit gate complete, publication pending

---

## Release Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.16.exe` |
| **Size** | 27,568,856 bytes (~26.29 MB) |
| **SHA256 (local build)** | `6FA36356C80A69BB1E43A11851B0E2EEFB9B31AA0726C7C5493E3A9FE13A12C4` |
| **Signature status** | Valid |
| **Signer DN** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Build tool** | Inno Setup + Authenticode (DigiCert live timestamp) |
| **Smoke test** | Passed |
| **Built** | 2026-03-31 |
| **GitHub asset size** | Pending tag push |
| **GitHub asset digest (authoritative)** | Pending tag push |
| **GitHub asset uploaded** | Pending tag push |
| **Release URL** | Pending tag push |

> **SHA256 note**: DigiCert live timestamping means each build produces a distinct binary. The GitHub release asset digest becomes the authoritative post-publication hash once the installer workflow uploads the signed release artifact.

---

## Version Alignment

| File | Version |
|---|---|
| `VERSION` | `v1.18.16` |
| `frontend/package.json` | `1.18.16` |
| `backend/main.py` | `1.18.16` |
| `INSTALLER_BUILDER.ps1` | `1.18.16` |
| `CHANGELOG.md` | `[1.18.16]` section present |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.16` |
| `docs/user/USER_GUIDE_COMPLETE.md` | `1.18.16` |
| `docs/development/DEVELOPER_GUIDE_COMPLETE.md` | `1.18.16` |

---

## Validation Gates Passed

| Gate | Result |
|---|---|
| `scripts/VERIFY_VERSION.ps1 -CheckOnly` | ✅ Passed |
| `COMMIT_READY.ps1 -Quick -Snapshot` | ✅ Passed (`artifacts/state/STATE_2026-03-31_145504.md`) |
| Version format | ✅ `v1.18.16` |
| Installer release inputs | ✅ Validated during installer build |
| Backend batch tests | ✅ `21/21` batches passed during commit gate |
| Frontend build | ✅ Passed |
| Frontend Vitest | ✅ `112` files / `1900` tests passed |
| Native smoke | ✅ backend `/health` 200 and frontend 200 |
| Docker smoke | ✅ `sms-app` healthy and `/health` 200 |
| Installer smoke test | ✅ Passed |
| Authenticode signature | ✅ Valid |

---

## Verification Artifacts

- State snapshot: `artifacts/state/STATE_2026-03-31_145504.md`
- Commit-ready log: `artifacts/state/COMMIT_READY_2026-03-31_145504.log`
- Backend batch log: `backend/test-results/backend_batch_run_20260331_145047.txt`

---

## Commits Since v1.18.15

| Hash | Description |
|---|---|
| `336551437` | chore(release): record v1.18.15 publication evidence -- GitHub digest, state snapshot |
| `e4849ce7d` | ci: reduce release-asset-sanitizer frequency from hourly to daily |
| `23a526859` | ci: disable excessive scheduled workflows - production health check (hourly), load testing (weekly) |
| `8099ebed8` | feat(installer): default to QNAP PostgreSQL; docs(user,installer): add Database Configuration guidance; fix(migrate): clarify migrate_sqlite_to_postgres usage; i18n: update Greek translations |
| `6ac9863c6` | maintenance fixes |
| `c5115b812` | fix(security): resolve open dependabot alerts |
| `49ddd3c66` | docs(deployment): add runbook status banner |

---

## Release Asset Policy

Per release-lineage policy:
- **Allowed**: `SMS_Installer_1.18.16.exe` (installer only)
- **Allowed**: GitHub release digest metadata (SHA256 via GitHub asset digest)
- **Not allowed**: generic CI artifacts, source archives, or additional binaries

---

## GitHub Release Checklist

- [ ] Commit `chore(release): prepare v1.18.16` created and pushed to `main`
- [ ] Tag `v1.18.16` created and pushed
- [ ] `Create GitHub Release on tag` workflow succeeded
- [ ] `Release - Build & Upload Installer (GitHub Digest)` workflow succeeded
- [ ] `Release Asset Sanitizer` confirmed installer-only assets
- [ ] Published installer filename is `SMS_Installer_1.18.16.exe`
- [ ] GitHub release digest recorded
