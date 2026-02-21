# $11.18.3 - RBAC Imports Fallback Patch + Installer Refresh

## 🛠️ What’s fixed

This patch release narrows a legacy RBAC fallback to `imports:*` permissions only, preserving strict authorization behavior while keeping import flows functional for legacy/migrated permission states.

## ✅ Release integrity

- Signed installer built for `$11.18.3`
- Installer digest computed and sidecar generated
- Release asset set remains installer-focused (`.exe` + `.sha256`)

## 📦 Assets

- `SMS_Installer_1.18.3.exe`
  SHA256: `86fb67cdf39bc25c7e68a939c3194e01d35c9bdf86c8d719d0adba0c309c13c4`
  Size: `119232344` bytes

- `SMS_Installer_1.18.3.exe.sha256`
  Contains installer SHA256 sidecar line

## 🔄 Upgrade

Direct patch upgrade from `$11.18.3`.

- Production: `DOCKER.ps1`
- Development/testing: `NATIVE.ps1`

## 📚 Notes

See full details in: `docs/releases/RELEASE_NOTES_$11.18.3.md`

---

**Full Changelog:** https://github.com/bs1gr/AUT_MIEEK_SMS/compare/$11.18.3...$11.18.3
