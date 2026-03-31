# Release Manifest - v1.18.16

**Version**: 1.18.16
**Release Date**: 2026-03-31
**Prepared By**: Solo Developer + AI Assistant
**Status**: ✅ PUBLISHED + VERIFIED

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
| **GitHub asset size** | 26,202,544 bytes |
| **GitHub asset digest (authoritative)** | `sha256:7eb8c32d1b6cf1a012e3b6d6c57210a9b29235f11c70b4783603e88ca0bb945d` |
| **GitHub asset uploaded** | 2026-03-31T12:04:18Z |
| **Downloaded release asset hash** | `7EB8C32D1B6CF1A012E3B6D6C57210A9B29235F11C70B4783603E88CA0BB945D` |
| **Downloaded release asset signature** | Valid |
| **Release URL** | https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.16 |

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
| `fcb2570f6` | chore(release): prepare v1.18.16 |

---

## Release Asset Policy

Per release-lineage policy:
- **Allowed**: `SMS_Installer_1.18.16.exe` (installer only)
- **Allowed**: GitHub release digest metadata (SHA256 via GitHub asset digest)
- **Not allowed**: generic CI artifacts, source archives, or additional binaries

---

## GitHub Release Checklist

- ✅ Commit `fcb2570f6` (`chore(release): prepare v1.18.16`) pushed to `main`
- ✅ Tag `v1.18.16` created and pushed (`2026-03-31`)
- ✅ `Create GitHub Release on tag` workflow succeeded — Run `23796230467`, published `2026-03-31T12:02:29Z`
- ✅ `Release - Build & Upload Installer (GitHub Digest)` workflow succeeded — Run `23796249268`
- ✅ `Release Asset Sanitizer` confirmed installer-only assets — Run `23796614869`
- ✅ Published installer filename is `SMS_Installer_1.18.16.exe` (asset ID `385505550`)
- ✅ GitHub release digest recorded and matched downloaded asset hash
- ✅ Downloaded published installer verified with `Get-AuthenticodeSignature` → `Valid`
