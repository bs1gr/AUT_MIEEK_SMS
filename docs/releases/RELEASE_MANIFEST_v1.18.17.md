# Release Manifest - vv1.18.21

**Version**: 1.18.17
**Release Date**: 2026-04-08
**Prepared By**: Solo Developer + AI Assistant
**Status**: ✅ PUBLISHED + VERIFIED

---

## Release Artifact

| Property | Value |
|---|---|
| **Filename** | `SMS_Installer_1.18.17.exe` |
| **Size** | `26,949,008` bytes (~25.70 MB) |
| **SHA256 (local build)** | `D181AD51D75CD7618E0B4CDD7C38EBB59C773C00B6182F8EBCA5A4D9E3E59E68` |
| **Signature status** | Valid |
| **Signer DN** | `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY` |
| **Signer Thumbprint** | `2693C1B15C8A8E5E45614308489DC6F4268B075D` |
| **Build tool** | Inno Setup + Authenticode (DigiCert live timestamp) |
| **Smoke test** | Passed |
| **Built** | 2026-04-08 |
| **GitHub asset size** | `26,206,640` bytes |
| **GitHub asset digest (authoritative)** | `sha256:71c15e3bdc910f379b23bc73cb67aeec1f6a8efaebad98f85e47910676d8481a` |
| **Downloaded release asset hash** | `71C15E3BDC910F379B23BC73CB67AEEC1F6A8EFAEBAD98F85E47910676D8481A` |
| **Downloaded release asset signature** | Valid |
| **Release URL** | https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vv1.18.21 |

> **SHA256 note**: DigiCert live timestamping means each build produces a distinct binary. The GitHub release asset digest becomes the authoritative post-publication hash once the installer workflow uploads the signed release artifact.

---

## Version Alignment

| File | Version |
|---|---|
| `VERSION` | `vv1.18.21` |
| `frontend/package.json` | `1.18.17` |
| `frontend/package-lock.json` | `1.18.17` |
| `backend/main.py` | `1.18.17` |
| `INSTALLER_BUILDER.ps1` | `1.18.17` |
| `CHANGELOG.md` | `[1.18.17]` section present |
| `docs/DOCUMENTATION_INDEX.md` | `1.18.17` |
| `docs/user/USER_GUIDE_COMPLETE.md` | `1.18.17` |
| `docs/development/DEVELOPER_GUIDE_COMPLETE.md` | `1.18.17` |

---

## Local Validation Gates Passed

| Gate | Result |
|---|---|
| `.\INSTALLER_BUILDER.ps1 -Action build -Version 1.18.17 -AutoFix` | ✅ Passed |
| Local installer signature | ✅ Valid |
| Local installer smoke test | ✅ Passed |
| Native smoke | ✅ backend `/health` 200 and frontend 200 |
| Docker smoke | ✅ `sms-app` healthy and `/health` 200 |
| `scripts/VERIFY_VERSION.ps1 -CheckOnly` | ✅ Passed |
| `COMMIT_READY.ps1 -Quick -Snapshot` | ✅ Passed (`artifacts/state/STATE_2026-04-08_175612.md`) |
| Backend batch tests | ✅ `21/21` batches passed (`backend/test-results/backend_batch_run_20260408_175209.txt`) |

---

## Commits Since vv1.18.21

| Hash | Description |
|---|---|
| `cdfdb6b29` | fix(frontend): override lodash for dependabot |
| `ad9e38617` | fix(frontend): upgrade vite to 7.3.2 for dependabot |
| `c91257a57` | fix(installer): harden db packaging and remote postgres setup |
| `aef71b3f9` | fix(docker): self-heal remote qnap runtime |
| `de8a75527` | docs(status): close post-release security alert follow-up |
| `38f2e39e1` | chore(release): record vv1.18.21 publication evidence |

---

## Release Asset Policy

Per release-lineage policy:
- **Allowed**: `SMS_Installer_1.18.17.exe` (installer only)
- **Allowed**: GitHub release digest metadata (SHA256 via GitHub asset digest)
- **Not allowed**: generic CI artifacts, source archives, or additional binaries

---

## GitHub Release Checklist

- ✅ Commit `c1e576e44` (`chore(release): prepare vv1.18.21`) pushed to `main`
- ✅ Tag `vv1.18.21` created and pushed (`2026-04-08`)
- ✅ `Create GitHub Release on tag` workflow succeeded — Run `24142472615`, published `2026-04-08T15:03:11Z`
- ✅ `Release - Build & Upload Installer (GitHub Digest)` workflow succeeded — Run `24142499707`
- ✅ Published installer filename is `SMS_Installer_1.18.17.exe`
- ✅ GitHub release digest recorded and matched downloaded asset hash
- ✅ Downloaded published installer verified with `Get-AuthenticodeSignature` -> `Valid`
