# v1.18.3 - RBAC Imports Fallback Patch + Installer Refresh

## 🛠️ What’s fixed

This patch release narrows a legacy RBAC fallback to `imports:*` permissions only, preserving strict authorization behavior while keeping import flows functional for legacy/migrated permission states.

## ✅ Release integrity

- Signed installer built for `v1.18.3`
- Installer digest computed and sidecar generated
- Release asset set remains installer-focused (`.exe` + `.sha256`)

## 📦 Assets

- `SMS_Installer_1.18.3.exe`
  SHA256: `c6f8eb7e0c84faa97ae049de3c81d2c967ca54880f6c7b52afa7fa3ec88c382c`
  Size: `119231568` bytes

- `SMS_Installer_1.18.3.exe.sha256`
  Contains installer SHA256 sidecar line

## 🔄 Upgrade

Direct patch upgrade from `v1.18.2`.

- Production: `DOCKER.ps1`
- Development/testing: `NATIVE.ps1`

## 📚 Notes

See full details in: `docs/releases/RELEASE_NOTES_v1.18.3.md`

---

**Full Changelog:** https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.2...v1.18.3
