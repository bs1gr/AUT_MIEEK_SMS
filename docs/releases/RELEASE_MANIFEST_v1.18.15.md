# Release Manifest — v1.18.15

**Version**: 1.18.15  
**Release Date**: 2026-03-21  
**Prepared By**: Solo Developer + AI Assistant  
**Status**: ✅ PREPARED

---

## Release Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.15.exe` |
| **Size** | 27,024,096 bytes (~27 MB) |
| **SHA256 (local build)** | `E7428BC4CD1924FB912DE59E0056D9109673572667B13C7849C8E5455BEA80CE` |
| **Signature status** | Valid |
| **Signer DN** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Build tool** | Inno Setup + Authenticode (DigiCert live timestamp) |
| **Smoke test** | Passed |
| **Built** | 2026-03-21 |

> **SHA256 note**: DigiCert live timestamping means each build produces a distinct binary. The GitHub release asset digest (recorded after upload) is the authoritative post-publication hash.

---

## Version Alignment

| File | Version |
|---|---|
| `VERSION` | `v1.18.15` |
| `frontend/package.json` | `1.18.15` |
| `backend/main.py` | `1.18.15` |
| `INSTALLER_BUILDER.ps1` | `1.18.15` |
| `CHANGELOG.md` | `[1.18.15]` section present |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.15` |
| `DOCUMENTATION_INDEX.md` (root) | `1.18.15` |
| `docs/user/USER_GUIDE_COMPLETE.md` | `1.18.15` |
| `docs/development/DEVELOPER_GUIDE_COMPLETE.md` | `1.18.15` |

---

## Validation Gates Passed

| Gate | Result |
|---|---|
| `scripts/VERIFY_VERSION.ps1 -CheckOnly` | ✅ 8/8 required checks passed |
| Version format | ✅ `v1.18.15` (valid) |
| Installer release inputs | ✅ All tracked inputs validated |
| Backend Ruff (linting) | ✅ Clean |
| Backend MyPy (type checking) | ✅ Clean |
| Frontend ESLint | ✅ Clean |
| Markdown lint | ✅ Clean |
| TypeScript type check | ✅ Clean |
| Translation integrity | ✅ Verified |
| Backend pytest (102 files) | ✅ All passing |
| Frontend Vitest | ✅ Passed |
| Installer smoke test | ✅ Passed |
| Authenticode signature | ✅ Valid |

---

## Commits Since v1.18.14

| Hash | Description |
|---|---|
| `1a5fe6cd4` | chore(gitignore): ignore root-level DOCUMENTATION_INDEX.md duplicate |
| `370f23403` | fix(rbac): ensure user permissions table exists |
| `ee748b7e8` | fix(validation): harden installer tooling and batch retests |
| `5e5241a9c` | fix(ci): update trivy-action 0.20.0 to v0.35.0 to resolve unresolvable tag |
| `a42e0a2bb` | fix(installer): recover postgres auth drift during single-mode startup |
| `b9151554b` | fix(installer): add missing forward declaration for db profile defaults |
| `5ddd772f4` | fix(installer): add SQLite/QNAP DB selection and harden startup profile defaults |
| `4688e4cc5` | chore(docs): record v1.18.14 publication verification evidence |

---

## Release Asset Policy

Per release-lineage policy:
- **Allowed**: `SMS_Installer_1.18.15.exe` (installer only)
- **Allowed**: GitHub release digest metadata (SHA256 via GitHub asset digest)
- **Not allowed**: generic CI artifacts, source archives, or additional binaries

---

## GitHub Release Checklist

- [ ] Tag `v1.18.15` created and pushed
- [ ] `Create GitHub Release on tag` workflow succeeded
- [ ] `Release - Build & Upload Installer (GitHub Digest)` workflow succeeded
- [ ] `Release Asset Sanitizer` workflow confirmed installer-only assets
- [ ] Published installer filename: `SMS_Installer_1.18.15.exe`
- [ ] Release marked as latest (non-prerelease)
