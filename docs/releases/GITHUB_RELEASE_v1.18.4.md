## Student Management System v1.18.4

Patch release focused on backup reliability, control-operation authorization hardening, and release safety gates.

### ✅ Highlights

- Hardened control API authorization for backup operations (including save-to-path scope).
- Improved backup integrity for SQLite WAL-mode databases.
- Added idempotent backup-related DB migration to prevent API 500 runtime failures.
- Stabilized RBAC enforcement/testing setup (`AUTH_MODE=permissive` in targeted tests).
- Removed redundant backup shutdown-token field from DevTools UI.
- Kept strict release lineage + installer-only asset governance.

### 🔐 Release Governance

This release follows the corrected lineage workflow:

- `release-on-tag.yml`
- `release-installer-with-sha.yml`
- `release-asset-sanitizer.yml`

Installer assets are strictly allowlisted:

- `SMS_Installer_1.18.4.exe`
- `SMS_Installer_1.18.4.exe.sha256`

### 📦 Artifacts

- `SMS_Installer_1.18.4.exe`
- `SMS_Installer_1.18.4.exe.sha256`

### 🧪 Notes

- No breaking API changes are introduced in this patch.
- Runtime/local artifacts were excluded from release scope.
- Full change curation was performed from `v1.18.3..HEAD`.
