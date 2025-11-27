# v1.9.3 Cleanup Archive

**Archived:** 2025-11-27
**Reason:** Deprecated stubs, legacy .bat wrappers, and redundant files identified during v1.9.3 codebase audit

## Contents

### Deprecated Stub Scripts

| File | Original Location | Reason |
|------|------------------|--------|
| `stop_monitor.ps1` | `tools/` | Stub pointing to `scripts/operator/stop_monitor.ps1` |
| `dev_KILL_FRONTEND_NOW.ps1` | `scripts/dev/internal/` | Stub pointing to `scripts/operator/` |

### Legacy .bat Wrappers

| File | Original Location | Reason |
|------|------------------|--------|
| `CLEANUP.bat` | `scripts/dev/` | PowerShell wrapper no longer needed |
| `internal_CLEANUP.bat` | `scripts/dev/internal/` | PowerShell wrapper no longer needed |
| `UNINSTALL.bat` | `scripts/deploy/` | Referenced removed CLEANUP.bat |
| `CREATE_DEPLOYMENT_PACKAGE.bat` | `scripts/deploy/internal/` | PowerShell version preferred |
| `INSTALLER.bat` | `scripts/deploy/internal/` | PowerShell version preferred |

## Also Removed (Not Archived)

The following build artifacts were removed without archiving:

- `tmp_test_migrations/` - Temporary test database folder
- `dist/install_test.log` - Installation test log
- `dist/SMS_Distribution_1.9.2.zip` - Old version distribution
- `dist/SMS_Installer_1.9.2.exe` - Old version installer
- `scripts/deploy/CHECK_VOLUME_VERSION.ps1` - Duplicate (merged into `scripts/CHECK_VOLUME_VERSION.ps1`)

## Migration Notes

- Use `DOCKER.ps1` for all Docker operations
- Use `NATIVE.ps1` for all native development operations
- Use `scripts/operator/` for operator-only scripts
- PowerShell scripts are preferred over .bat wrappers
