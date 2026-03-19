# Release Manifest - Version 1.18.14

**Release Date (target)**: March 19, 2026
**Tag**: v1.18.14
**Branch**: main
**Previous Tag**: v1.18.13

---

## 📦 Release Artifacts

### Required Assets

| Artifact | Filename | Description |
|----------|----------|-------------|
| Installer | `SMS_Installer_1.18.14.exe` | Windows installer (Inno Setup) |

### Asset Allowlist (Installer-only policy)

Only the following asset is permitted on the GitHub Release:
- `SMS_Installer_<version>.exe`

GitHub release digest metadata is the authoritative SHA256 source for this release line.

---

## 🔖 Version References

| File | Expected Value |
|------|---------------|
| `VERSION` | `v1.18.14` |
| `frontend/package.json` | `"version": "1.18.14"` |
| `backend/main.py` | `Version: 1.18.14` |
| `INSTALLER_BUILDER.ps1` | `Version: 1.18.14` |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.14` |
| `CHANGELOG.md` | includes `[1.18.14]` section |

---

## 📋 Commit Range

**Base Tag**: v1.18.13
**Head Commit (prep)**: `84405d5f7`

### Scope Highlights

- Security/code-scanning hardening in control backup and updater flows
- Traversal regression test coverage for control database download route
- Dependency remediation and lockfile alignment:
  - `socket.io-parser@4.2.6`
  - `flatted@3.4.2`
  - `werkzeug>=3.1.6`
  - `pypdf>=6.9.1`

---

## ✅ Validation Gates

### Pre-Release Gates

- [x] Version metadata aligned to `v1.18.14`
- [x] Release notes generated (`RELEASE_NOTES`, `GITHUB_RELEASE`, `.github/RELEASE_NOTES`)
- [x] Security-focused backend tests passed (`25 passed`)
- [x] Backend batch-run passed (`34/34` batches)
- [x] Frontend full Vitest passed (`112 files`, `1900 tests`)
- [x] Frontend audit clean (`0` vulnerabilities)
- [x] Backend environment audit clean (`pip_audit`: no known vulnerabilities)
- [x] State snapshot recorded (`artifacts/state/STATE_2026-03-19_204251.md`)

### Publication Gates

- [x] Local installer build/sign/smoke for `v1.18.14`
- [x] Tag `v1.18.14` created and pushed
- [x] `Create GitHub Release on tag` workflow succeeds (`run 23313536112`)
- [x] `Release - Build & Upload Installer with SHA256` workflow succeeds (`run 23313558162`)
- [x] `Release Asset Sanitizer` workflow success observed (`run 23313293736`)
- [x] Release page published: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.14`
- [x] Digest metadata visible for installer asset (`sha256:63dfccbe64f8a9cecc3089780e004bdac9139234a333805c3c84e2b81c88816a`)

### Local Installer Evidence

- File: `dist/SMS_Installer_1.18.14.exe`
- Signature status: `Valid`
- Signer: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
- SHA256: `78B10CA0D5A4F9E8C2A46C29ADBC4210BF66C275165E0678DC44CA55C898E9D6`
