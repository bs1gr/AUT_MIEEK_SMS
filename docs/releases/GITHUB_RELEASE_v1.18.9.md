## What's New in v1.18.9

### 🔐 Security + Deployment Hardening

- Default database profile is now **secure local SQLite** (`SMS_DATABASE_PROFILE=local`).
- Remote PostgreSQL is now explicit opt-in via `SMS_DATABASE_PROFILE=remote` plus `POSTGRES_*` credentials.
- Single-image runtime startup now respects profile selection (`sqlite` vs `postgresql`) instead of forcing remote credentials.

### ✨ New Database Credential Import Flow

- Added endpoint: `POST /control/api/database/test-connection`
  - Validates connection credentials without saving.
- Added endpoint: `POST /control/api/database/import-credentials?auto_connect=true|false`
  - Supports `.json` and `.env` credential files.
  - `auto_connect=true`: save to `.env` and switch to remote profile.
  - `auto_connect=false`: test-only mode.

### 🖥️ Control Panel UI

- Added Upload Credentials section in:
  - `Power` → `Control Panel` → `Maintenance` → `Database Management`
- New actions:
  - **Validate & Connect**
  - **Test Only**
- EN/EL i18n coverage included.

### ✅ Validation Snapshot

- Targeted frontend lint on changed files: **pass**
- Targeted backend tests for new credential endpoints: **4/4 pass**
- Runtime verification confirmed healthy remote PostgreSQL connection when remote mode is enabled.

### 📦 Installation

- **Windows**: Download `SMS_Installer_1.18.9.exe` from release assets.
- **Docker (production)**: `./DOCKER.ps1 -Update`
- **Native (development)**: `./NATIVE.ps1 -Start`
