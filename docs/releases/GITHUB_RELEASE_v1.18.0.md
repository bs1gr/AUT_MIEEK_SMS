# GitHub Release Draft - v1.18.0

**Use this content to create the GitHub Release at:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new

---

## Tag Information

- **Tag version**: `v1.18.0`
- **Target**: `main`
- **Release title**: `v1.18.0`

---

## Release Body (Full)

# 🚀 Student Management System v1.18.0

This release finalizes PostgreSQL standardization, hardens migration reliability, and refreshes the signed Windows installer.

## ✅ Highlights

- **PostgreSQL runtime standardization**
  - Docker runtime now uses explicit engine selection to prevent silent SQLite/PostgreSQL mode flips.
  - Persistence verified across stop/start cycles.

- **SQLite → PostgreSQL migration hardening**
  - Migration runner now safely handles percent-encoded DB URLs (e.g. `%21` in passwords).
  - Migration helper now skips missing destination tables gracefully (warns, continues), instead of aborting full migration.

- **Installer refresh**
  - New installer artifact rebuilt for `v1.18.0`.
  - Authenticode signing verified with:
    - Subject: `CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY`
    - Thumbprint: `2693C1B15C8A8E5E45614308489DC6F4268B075D`

## 🔍 Verified State

- PostgreSQL data verified after migration and restart:
  - `users=3`
  - `students=5`
  - `grades=17`
  - `attendances=56`
- Targeted backend migration tests passed:
  - `tests/test_run_migrations.py`
  - `tests/test_run_migrations_unit.py`

## 📦 Included Commits

- `fb4c13925` — docs(plan): record postgres standardization and installer refresh
- `3b27f7c0c` — fix(db+release): harden postgres migration and refresh v1.18.0 installer
- `03e19c848` — fix(ci): prevent installer release auto-overwrite and block undersized assets

## 🔐 Integrity

**SHA256 (`SMS_Installer_1.18.0.exe`)**:  
`DE13F4246ADB304119E58510A5F1E7BF034DC1F465F8F7C13D5B02E496A47C95`

---

## Release Body (Short / GitHub-Friendly)

# 🚀 v1.18.0

### What’s new
- Standardized Docker runtime to **explicit PostgreSQL mode** (no silent engine flips).
- Hardened SQLite→PostgreSQL migration:
  - Handles percent-encoded DB URLs safely.
  - Skips missing destination tables with warning (continues migration).
- Refreshed and re-signed Windows installer (`SMS_Installer_1.18.0.exe`).

### Verification
- PostgreSQL persistence validated across restart (`users=3`, `students=5`, `grades=17`, `attendances=56`).
- Targeted migration tests passed (`test_run_migrations.py`, `test_run_migrations_unit.py`).
- Installer signature verified (AUT MIEEK cert, Limassol/CY).

### Integrity
- **SHA256 (`SMS_Installer_1.18.0.exe`)**: `DE13F4246ADB304119E58510A5F1E7BF034DC1F465F8F7C13D5B02E496A47C95`

### Key commits
- `fb4c13925` docs(plan): record postgres standardization and installer refresh
- `3b27f7c0c` fix(db+release): harden postgres migration and refresh v1.18.0 installer
- `03e19c848` fix(ci): prevent installer release auto-overwrite and block undersized assets
