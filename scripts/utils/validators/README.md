# Validators - Input and System Validation Tools

Consolidated validation utilities for the Student Management System.

## Purpose

Provides unified validation functionality for imports, schemas, and configurations across the project.

## Available Validators

### import_checker.py - Unified Import Validator

**Consolidates:**

- `scripts/utils/validators/import_checker.py` - Unified import validation (backend.db, requirements, package structure)

**Purpose:** Validate Python import consistency and coverage

**Usage:**

```bash
# Run all validations (default)
python scripts/utils/validators/import_checker.py

# Check specific validation mode
python scripts/utils/validators/import_checker.py --mode requirements
python scripts/utils/validators/import_checker.py --mode backend
python scripts/utils/validators/import_checker.py --mode package

# Specify custom root directory
python scripts/utils/validators/import_checker.py --root /path/to/project
```

**Validation Modes:**

- **requirements** - Verify all backend imports are in requirements.txt
  - Scans backend/ for all imports
  - Checks against backend/requirements.txt
  - Reports missing dependencies

- **backend** - Validate core backend module imports work
  - Tests: backend.db, backend.db_utils, backend.models, etc.
  - Ensures modules are importable
  - Catches import errors early

- **package** - Verify package structure and `__init__.py` files
  - Checks required `__init__.py` files exist
  - Validates package initialization
  - Ensures proper Python package structure

- **all** - Run all validation modes (default)

**Exit Codes:**

- `0` - All validations passed
- `1` - Validation errors found
- `2` - Argument or runtime errors

**Example Output:**

```python
🔍 Import Validator - Mode: REQUIREMENTS
Working Directory: /path/to/project

======================================================================
MODE: Requirements Validation
======================================================================
Checking: /path/to/backend
Requirements: /path/to/backend/requirements.txt

Found 45 modules in requirements.txt

  ✅ All imports found in requirements.txt

======================================================================
SUMMARY
======================================================================
Requirements:   ✅ PASS
Backend:        ✅ PASS
Package:        ✅ PASS

✅ All validations PASSED
```

## Integration

### CI/CD Pipeline

Used in GitHub Actions to validate imports before merge:

```yaml
- name: Validate Imports
  run: python scripts/utils/validators/import_checker.py --mode all
```

### Local Development

Run before committing:

```bash
# Quick check
python scripts/utils/validators/import_checker.py --mode requirements

# Full validation
python scripts/utils/validators/import_checker.py
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: import-validation
      name: Import Validation
      entry: python scripts/utils/validators/import_checker.py
      language: system
      types: [python]
      stages: [commit]
```

## Migration Notes

### From Old Tools

**Before:**

```bash
python tools/check_imports.py
python tools/check_imports_requirements.py
python tools/test_import_backend_db.py
```

**After:**

```bash
python scripts/utils/validators/import_checker.py --mode all
```

### Backward Compatibility

Old tools still available at original locations but marked deprecated. A thin
compatibility wrapper is preserved for automation that still shells out to the
historic paths:

- `tools/check_imports.py` → deprecated
- `tools/check_imports_requirements.py` → legacy wrapper delegating to
  `scripts/utils/validators/import_checker.py`
- `tools/test_import_backend_db.py` → deprecated
- `tools/test_pkg_import.py` → deprecated

To migrate:

1. Update CI/CD references to use new path
2. Update pre-commit hooks to use new validator
3. Update local scripts and documentation
4. Keep old tools until v1.12.0 for backward compatibility

## Adding New Validators

To add a new validation mode to `import_checker.py`:

1. Add validation method to `ImportValidator` class:

```python
def validate_custom(self) -> bool:
    """Validate custom aspect."""
    print("Checking custom validation...")
    # Implementation
    return success
```

2. Register in `run()` method:

```python
if mode in ("all", "custom"):
    results["custom"] = self.validate_custom()
```

3. Add argument option:

```python
parser.add_argument(
    "--mode",
    choices=["requirements", "backend", "package", "custom", "all"],
    default="all"
)
```

4. Test and document in this README

## Schema Validator (Future)

Placeholder for database schema validation utilities:

```python
from scripts.utils.validators import SchemaValidator

validator = SchemaValidator()
validator.check_schema_drift()
validator.verify_migrations()
```

---

**Created:** December 9, 2025  
**Status:** Phase 1 Implementation  
**Consolidation Phase:** v1.11.0
