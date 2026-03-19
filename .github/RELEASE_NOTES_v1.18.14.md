## What's New in v1.18.14

### Security and dependency hardening

- Hardened backup filename trust boundaries in control/database flows.
- Added fail-closed invalid updater `job_id` handling.
- Added traversal regression coverage for control database backup download.
- Updated frontend lockfile dependencies (`socket.io-parser@4.2.6`, `flatted@3.4.2`).
- Updated backend security-sensitive minimums (`werkzeug>=3.1.6`, `pypdf>=6.9.1`) and aligned prior CVE-driven dependency updates in this release range.

### Verification highlights

- Backend targeted security tests: **25 passed**.
- Backend batch runner: **34/34 batches passed**.
- Frontend Vitest: **112 files / 1900 tests passed**.
- Frontend audit: **0 vulnerabilities**.
- Backend environment audit (`pip_audit`): **no known vulnerabilities**.
- Installer build/sign/smoke: **passed** (`SMS_Installer_1.18.14.exe`, signature `Valid`, SHA256 `78B10CA0D5A4F9E8C2A46C29ADBC4210BF66C275165E0678DC44CA55C898E9D6`).

### Installation

- **Windows installer**: `SMS_Installer_1.18.14.exe`
- **Docker**: `./DOCKER.ps1 -Update`
- **Native development**: `./NATIVE.ps1 -Start`

### Documentation

- `CHANGELOG.md`
- `docs/releases/RELEASE_NOTES_v1.18.14.md`
- `docs/releases/RELEASE_MANIFEST_v1.18.14.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_v1.18.14.md`


