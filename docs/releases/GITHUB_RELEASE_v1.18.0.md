# GitHub Release Draft - v1.18.0

**Use this content to create the GitHub Release at:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new

---

## Tag Information

- **Tag version**: `v1.18.0`
- **Target**: `main`
- **Release title**: `v1.18.0`

---

## Release Body (GitHub)

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
- **SHA256 (`SMS_Installer_1.18.0.exe`)**: `77D644DB1C9015B28F1736BD0B48E2F1A826AFE499278F83F758137B24181308`

### Key commits
- `fb4c13925` docs(plan): record postgres standardization and installer refresh
- `3b27f7c0c` fix(db+release): harden postgres migration and refresh v1.18.0 installer
- `03e19c848` fix(ci): prevent installer release auto-overwrite and block undersized assets
