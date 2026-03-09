## What's New in v1.18.9

### 🔐 Security + Database Profile Hardening

- Default profile now uses secure local SQLite (`SMS_DATABASE_PROFILE=local`).
- Remote PostgreSQL now requires explicit opt-in (`SMS_DATABASE_PROFILE=remote`) and valid `POSTGRES_*` credentials.
- Single-image startup flow updated to respect profile selection.

### ✨ New Database Credentials Onboarding

- Added `POST /control/api/database/test-connection`.
- Added `POST /control/api/database/import-credentials?auto_connect=true|false`.
- Supported file formats: `.json`, `.env`.
- `auto_connect=true` updates `.env` and switches to remote profile when validation succeeds.

### 🖥️ Control Panel UI

- New upload interface under:
  - `Power` → `Control Panel` → `Maintenance` → `Database Management`
- Includes:
  - **Validate & Connect**
  - **Test Only**
- Includes EN/EL translation coverage.

### ✅ Validation

- Frontend lint on changed files: pass
- Targeted backend tests for new endpoints: 4/4 pass
- Runtime remote PostgreSQL health verification: pass
