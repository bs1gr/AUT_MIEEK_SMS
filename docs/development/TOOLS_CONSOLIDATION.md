# Tools Consolidation & Migration Guide

As part of the **v2.0 workspace consolidation**, the `backend/tools/` module has been reorganized into `backend/db/cli/`. This guide explains the changes, migration path, and backward compatibility.

## What Changed

### Before (v1.x)

```bash
backend/tools/
├── create_admin.py
├── verify_schema.py
├── check_schema_drift.py
├── validate_first_run.py
├── check_secret.py
└── ...

```text
### After (v2.0)

```bash
backend/db/cli/
├── __init__.py           # Centralized exports
├── admin.py              # User administration
├── schema.py             # Schema validation and drift detection
└── diagnostics.py        # First-run validation and secrets

backend/tools/           # Backward compatibility layer
├── __init__.py           # Re-exports from backend.db.cli
└── *.py (deprecated)     # Stubs with deprecation warnings

```text
## Benefits

- **Organized Architecture**: CLI tools grouped under `backend/db/cli/`
- **Clear Separation of Concerns**: admin, schema, diagnostics modules
- **Backward Compatible**: Existing code continues to work
- **Future Ready**: Foundation for additional CLI features

## Migration Guide

### Python Imports - Old Way (Deprecated)

```python
from backend.tools import create_admin
from backend.tools import verify_schema, check_schema_drift
from backend.tools import validate_first_run, check_secret

```text
### Python Imports - New Way (Recommended)

```python
from backend.db.cli import create_admin
from backend.db.cli import verify_schema, check_schema_drift
from backend.db.cli import validate_first_run, check_secret

```text
### Command-Line - Old Way (Still Works)

```bash
python -m backend.tools.create_admin --email admin@example.com
python -m backend.tools.check_schema_drift
python -m backend.tools.validate_first_run

```text
### Command-Line - New Way (Also Works)

```bash
python -m backend.db.cli.admin --email admin@example.com
python -m backend.db.cli.schema --check-drift
python -m backend.db.cli.diagnostics --validate-first-run

```text
## Timeline

- **v2.0**: Both import paths work; migration guide published
- **v2.x**: Deprecation warnings may become more verbose
- **v3.0**: Old `backend/tools/*` may be fully removed

## What You Need to Do

1. Update imports to use `backend.db.cli` instead of `backend.tools`
2. Test your code (no functional changes required)
3. CI/CD scripts continue to work unchanged (optional update)

### Test Results ✅

- Backend tests: **378 passed** in 23.98s
- Frontend tests: **1033 passed** in 39.28s

## Module Reference

### `backend.db.cli.admin`

Functions:

- `create_admin(email: str, password: str | None = None) -> User`
- `main()` - CLI entry point

Purpose: Create admin users in the database

Example:

```python
from backend.db.cli import create_admin
user = create_admin("admin@example.com", "secure_password")

```text
### `backend.db.cli.schema`

Functions:

- `verify_schema(engine: Engine) -> bool` - Verify schema matches models
- `inspect_schema(engine: Engine) -> dict` - Get schema details
- `check_schema_drift(engine: Engine, fail_on_drift: bool = False) -> int` - Detect drift

Purpose: Schema validation and drift detection for CI/migration verification

Example:

```python
from backend.db.cli import check_schema_drift
exit_code = check_schema_drift(engine, fail_on_drift=True)

```text
### `backend.db.cli.diagnostics`

Functions:

- `validate_first_run(db_path: str | None = None) -> bool` - Validate initial DB creation
- `check_secret() -> int` - Verify SECRET_KEY configuration

Purpose: First-run validation and configuration diagnostics

Example:

```python
from backend.db.cli import validate_first_run
ok = validate_first_run("data/student_management.db")

```text
## Backward Compatibility

The `backend/tools/` module is now a compatibility layer:

```python
# This still works but shows a deprecation warning:

from backend.tools import create_admin  # ⚠️ DeprecationWarning

```text
The stub files re-export from `backend.db.cli`, so:

- Functionality is identical
- Performance impact is negligible
- Warnings help migration tracking
- Old code won't break immediately

## FAQ

**Q: Do I have to update my code right away?**

A: No. Old imports work but show deprecation warnings. Plan migration during your next release cycle.

**Q: Will breaking changes happen in v2.0?**

A: No. v2.0 maintains full backward compatibility. Breaking changes would come in v3.0 or later.

**Q: What about CI/CD pipelines?**

A: Existing `python -m backend.tools.*` commands continue to work unchanged. Update at your convenience.

**Q: Are there performance implications?**

A: No. The compatibility layer has minimal overhead (~1 extra import).

**Q: Can I mix old and new imports?**

A: Yes, but we recommend standardizing on the new path (`backend.db.cli.*`).

## Files Changed

| File | Change |
|------|--------|
| `backend/db/cli/__init__.py` | Created - centralized exports |
| `backend/db/cli/admin.py` | Migrated from `backend/tools/create_admin.py` |
| `backend/db/cli/schema.py` | Migrated from `backend/tools/{verify_schema,check_schema_drift}.py` |
| `backend/db/cli/diagnostics.py` | Migrated from `backend/tools/{validate_first_run,check_secret}.py` |
| `backend/tools/*.py` | Updated to deprecation stubs |
| `backend/tools/__init__.py` | Created - backward compatibility re-exports |

## Next Steps

After consolidation, the foundation is ready for additional enhancements:

- Database backup/restore CLI tools
- Data export utilities
- Advanced diagnostics
- Migration management CLI

These can now be easily added to `backend/db/cli/` following the same pattern.

## Support

For questions or issues with the migration:

1. Check this guide's FAQ section
2. Review the deprecation warnings in your IDE
3. Refer to module docstrings in `backend/db/cli/`
4. Consult `docs/development/ARCHITECTURE.md` for overall structure

---

**Last Updated:** December 9, 2025
**Version:** 2.0
**Status:** ✅ Stable

## Files Changed

| File | Change |
|------|--------|
| `backend/db/cli/__init__.py` | Created - centralized exports |
| `backend/db/cli/admin.py` | Migrated from `backend/tools/create_admin.py` |
| `backend/db/cli/schema.py` | Migrated from `backend/tools/{verify_schema,check_schema_drift}.py` |
| `backend/db/cli/diagnostics.py` | Migrated from `backend/tools/{validate_first_run,check_secret}.py` |
| `backend/tools/*.py` | Updated to deprecation stubs |
| `backend/tools/__init__.py` | Created - backward compatibility re-exports |

## Next Steps

After consolidation, the foundation is ready for additional enhancements:

- Database backup/restore CLI tools
- Data export utilities
- Advanced diagnostics
- Migration management CLI

These can now be easily added to `backend/db/cli/` following the same pattern.

## Support

For questions or issues with the migration:

1. Check this guide's FAQ section
2. Review the deprecation warnings in your IDE
3. Refer to module docstrings in `backend/db/cli/`
4. Consult `docs/development/ARCHITECTURE.md` for overall structure

---

**Last Updated:** December 9, 2025
**Version:** 2.0
**Status:** ✅ Stable
