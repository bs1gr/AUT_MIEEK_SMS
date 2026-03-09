# Release Notes - Version 1.18.9

**Release Date**: 2026-03-09  
**Previous Version**: v1.18.8

## 🔐 Security & Database Profile Hardening

- Switched installer/runtime defaults to **secure local SQLite mode** (`SMS_DATABASE_PROFILE=local`) instead of forcing a remote PostgreSQL profile.
- Added explicit profile selection model:
  - `local` → SQLite (`DATABASE_ENGINE=sqlite`)
  - `remote` → PostgreSQL (`DATABASE_ENGINE=postgresql` + `POSTGRES_*` credentials)
- Updated single-image startup flow to respect selected database profile.
- Updated `.env.example` with secure defaults and clear remote opt-in guidance.

## ✨ New Control Panel Capability

- Added backend endpoints for remote credential onboarding:
  - `POST /control/api/database/test-connection`
  - `POST /control/api/database/import-credentials?auto_connect=true|false`
- Supported credential file formats:
  - `.json`
  - `.env`-style key/value format
- Implemented connection validation flow:
 1. Parse uploaded credentials
 2. Test PostgreSQL connectivity
 3. Optionally persist to `.env` and switch profile to `remote`

## 🖥️ Frontend (Control Panel)

- Added **Upload Credentials** interface in:
  - `Power` → `Control Panel` → `Maintenance` → `Database Management`
- New UI actions:
  - **Validate & Connect**
  - **Test Only**
- Added bilingual EN/EL labels and feedback messages for the credential import workflow.

## ✅ Verification Evidence (This Release Scope)

- Targeted frontend lint for changed files: **passed**
- Targeted backend endpoint tests for credential import/testing: **4/4 passed**
- Runtime verification confirmed healthy remote PostgreSQL connection when remote profile is enabled.


