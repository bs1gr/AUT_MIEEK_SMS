# Release Manifest - v1.18.17

**Version**: 1.18.17
**Release Date**: 2026-04-08
**Prepared By**: Solo Developer + AI Assistant
**Status**: ✅ PREPARED | ⏳ TAG / GITHUB PUBLISH PENDING

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
| **GitHub asset digest (authoritative)** | Pending CI upload |
| **Release URL** | Pending tag push |

> **SHA256 note**: DigiCert live timestamping means each build produces a distinct binary. The GitHub release asset digest becomes the authoritative post-publication hash once the installer workflow uploads the signed release artifact.

---

## Version Alignment

| File | Version |
|---|---|
| `VERSION` | `v1.18.17` |
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

---

## Commits Since v1.18.16

| Hash | Description |
|---|---|
| `cdfdb6b29` | fix(frontend): override lodash for dependabot |
| `ad9e38617` | fix(frontend): upgrade vite to 7.3.2 for dependabot |
| `c91257a57` | fix(installer): harden db packaging and remote postgres setup |
| `aef71b3f9` | fix(docker): self-heal remote qnap runtime |
| `de8a75527` | docs(status): close post-release security alert follow-up |
| `38f2e39e1` | chore(release): record v1.18.16 publication evidence |

---

## Release Asset Policy

Per release-lineage policy:
- **Allowed**: `SMS_Installer_1.18.17.exe` (installer only)
- **Allowed**: GitHub release digest metadata (SHA256 via GitHub asset digest)
- **Not allowed**: generic CI artifacts, source archives, or additional binaries
