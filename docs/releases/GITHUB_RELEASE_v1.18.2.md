# v1.18.2 - Installer Runtime Hotfix

## 🛠️ What’s fixed

This patch release resolves the installer runtime failure reported in the 1.18.1 line by publishing a corrected installer from a new release lineage (`v1.18.2`).

## ✅ Release integrity

- Signed installer workflow path enforced
- Installer-only assets enforced on release
- Post-upload digest verification performed

## 📦 Assets

- `SMS_Installer_1.18.2.exe`  
  SHA256: `1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`  
  Size: `26,115,744` bytes

- `SMS_Installer_1.18.2.exe.sha256`  
  Contains installer SHA256: `1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`

## 🔄 Upgrade

This is a direct patch upgrade from `v1.18.1`.

- Production: use `DOCKER.ps1`
- Development/testing: use `NATIVE.ps1`

## 📚 Notes

See full details in: `docs/releases/RELEASE_NOTES_v1.18.2.md`

---

**Full Changelog:** https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.18.1...v1.18.2
