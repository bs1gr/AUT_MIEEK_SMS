# GitHub Release Draft - $11.18.3

**Use this content to create the GitHub Release at:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new

---

## Tag Information

- **Tag version**: `$11.18.3`
- **Target**: `main`
- **Release title**: `$11.18.3`

---

## Release Body (GitHub)

# 🚀 $11.18.3

### What’s new- **NEW: Course Auto-Activation System**
- **Scheduled job**: Daily bulk update at 3:00 AM UTC for semester-based course activation
- **Real-time UI indicators**: Color-coded badges in course modals (green/amber/blue)
- **Monitoring**: Comprehensive audit logging for activation events
- **Frontend utility**: `courseAutoActivation.ts` (143 lines) with semester parsing logic
- **Testing**: 34 comprehensive unit tests (100% passing)
- **i18n support**: 6 translation keys each for EN/EL
- **Student Lifecycle UX**: Cascaded active/inactive views, safer deactivate/reactivate workflow
- **Reporting**: Migrated from `study_year` to `academic_year` / "Class" terminology- Standardized Docker runtime to **explicit PostgreSQL mode** (no silent engine flips).
- Hardened SQLite→PostgreSQL migration:
  - Handles percent-encoded DB URLs safely.
  - Skips missing destination tables with warning (continues migration).
- Refreshed and re-signed Windows installer (`SMS_Installer_1.18.0.exe`).

### Verification
- **Course auto-activation**: 34 comprehensive unit tests passing (100%)
- PostgreSQL persistence validated across restart (`users=3`, `students=5`, `grades=17`, `attendances=56`).
- Targeted migration tests passed (`test_run_migrations.py`, `test_run_migrations_unit.py`).
- CI/CD pipeline stability confirmed (frontend TypeScript + backend MyPy).
- Installer signature verified (AUT MIEEK cert, Limassol/CY).

### Integrity
- **SHA256 (`SMS_Installer_1.18.0.exe`)**: `77D644DB1C9015B28F1736BD0B48E2F1A826AFE499278F83F758137B24181308`

### Key commits
- `f6c6df9c4` docs(courses): document auto-activation enhancements
- `08625027a` test(courses): add comprehensive unit tests for courseAutoActivation
- `170001597` feat(courses): add auto-activation enhancements
- `a4a74ba50` feat(courses): auto-set active by semester dates
- `cacc2a130` fix(i18n): sync en/el dashboard and student locale keys
- `cfed5a334` feat(students): cascade primary students list by active status
- `fb4c13925` docs(plan): record postgres standardization and installer refresh
- `3b27f7c0c` fix(db+release): harden postgres migration and refresh $11.18.3 installer
- `03e19c848` fix(ci): prevent installer release auto-overwrite and block undersized assets
