# v1.18.4 - Stability & Security Hardening

This patch release consolidates post-v1.18.3 reliability improvements in backup handling, control API authorization, RBAC behavior, and release safety automation.

## Included

- Control API authorization hardening across backup operations.
- Backup integrity fix for SQLite WAL-mode captures.
- Idempotent DB migration for missing backup metadata columns.
- RBAC/test reliability fixes and admin control-flow improvements.
- DevTools backup UX cleanup and theme token correction.
- Release workflow safety gates validated (lineage, signature, digest, allowlist).

## Release Assets

- `SMS_Installer_1.18.4.exe`
- `SMS_Installer_1.18.4.exe.sha256`

## Validation

Release scope curated from `v1.18.3..HEAD` and prepared under corrected-lineage release policy.
