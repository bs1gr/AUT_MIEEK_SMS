# Migration Guide: $11.14.0 → $11.14.0

**Release Date:** December 29, 2025
**Release Type:** MAJOR (Breaking Changes)
**Migration Effort:** Low (simple import path updates)

---

## Overview

Version 1.13.0 removes all deprecated backend modules that were marked for deprecation in $11.14.0-$11.14.0. This is a **breaking change** requiring import path updates if you use any of the removed modules.

**Good News:**
- ✅ All removed modules have functional replacements already in place
- ✅ Modern replacements have been available since $11.14.0
- ✅ No database schema changes required
- ✅ No API endpoint changes
- ✅ Only Python import paths affected

---

## Breaking Changes Summary

### Removed Modules

1. **`backend/auto_import_courses.py`** → `backend.scripts.import_.courses`
2. **`backend/tools/`** directory (all 11 modules) → `backend.db.cli`

### Affected Users

**You are affected if:**
- ❌ You import `backend.auto_import_courses` in Python scripts
- ❌ You import any `backend.tools.*` modules
- ❌ You use command-line: `python -m backend.auto_import_courses`
- ❌ You have custom automation/scripts using old paths

**You are NOT affected if:**
- ✅ You only use the application through Docker/native startup scripts
- ✅ You only use the web UI (no custom scripts)
- ✅ You already updated to new import paths in $11.14.0+

---

## Migration Instructions

### 1. Course Import Module

**Old Code (REMOVED):**
```python
from backend.auto_import_courses import import_courses, parse_course_file

# Or command line:
python -m backend.auto_import_courses path/to/courses.csv
```

**New Code ($11.14.0+):**
```python
from backend.scripts.import_.courses import import_courses, parse_course_file

# Or command line:
python -m backend.scripts.import_.courses path/to/courses.csv
```

**Files to Update:**
- Custom import scripts
- Automation tools
- Cron jobs or scheduled tasks

---

### 2. Database Admin Tools

#### Create Admin User

**Old Code (REMOVED):**
```python
from backend.tools.create_admin import create_admin_user

create_admin_user(db, username="admin", email="admin@example.com", password="secure123")
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.admin import create_admin_user

create_admin_user(db, username="admin", email="admin@example.com", password="secure123")
```

**Command Line:**
```bash
# Old (REMOVED)
python -m backend.tools.create_admin

# New ($11.14.0+)
python -m backend.db.cli.admin --create-admin
```

---

### 3. Schema Management Tools

#### Database Reset

**Old Code (REMOVED):**
```python
from backend.tools.reset_db import reset_database

reset_database()
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.schema import reset_database

reset_database()
```

#### Schema Drift Check

**Old Code (REMOVED):**
```python
from backend.tools.check_schema_drift import check_drift

check_drift()
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.schema import check_drift

check_drift()
```

#### Schema Verification

**Old Code (REMOVED):**
```python
from backend.tools.verify_schema import verify_schema

verify_schema()
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.schema import verify_schema

verify_schema()
```

---

### 4. Diagnostic Tools

#### Secret/Credentials Check

**Old Code (REMOVED):**
```python
from backend.tools.check_secret import check_jwt_secret

check_jwt_secret()
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.diagnostics import check_jwt_secret

check_jwt_secret()
```

#### First Run Validation

**Old Code (REMOVED):**
```python
from backend.tools.validate_first_run import validate_first_run

validate_first_run()
```

**New Code ($11.14.0+):**
```python
from backend.db.cli.diagnostics import validate_first_run

validate_first_run()
```

---

## Complete Import Mapping

| Old Module | New Module | Category |
|-----------|-----------|----------|
| `backend.auto_import_courses` | `backend.scripts.import_.courses` | Course Import |
| `backend.tools.create_admin` | `backend.db.cli.admin` | Admin Tools |
| `backend.tools.reset_db` | `backend.db.cli.schema` | Schema Mgmt |
| `backend.tools.check_schema_drift` | `backend.db.cli.schema` | Schema Mgmt |
| `backend.tools.verify_schema` | `backend.db.cli.schema` | Schema Mgmt |
| `backend.tools.check_secret` | `backend.db.cli.diagnostics` | Diagnostics |
| `backend.tools.validate_first_run` | `backend.db.cli.diagnostics` | Diagnostics |
| `backend.tools.create_test_data` | `backend.db.cli.test_data` | Testing |
| `backend.tools.backup_db` | `backend.db.cli.backup` | Backup |
| `backend.tools.restore_db` | `backend.db.cli.backup` | Backup |
| `backend.tools.export_data` | `backend.db.cli.export` | Data Export |

---

## Automated Migration Script

Use this script to update all Python files in your custom code:

**`migrate_imports.py`**
```python
#!/usr/bin/env python3
"""
Automated import migration script for $11.14.0
Scans Python files and updates deprecated imports.
"""
import re
import sys
from pathlib import Path

MIGRATIONS = {
    "from backend.auto_import_courses import": "from backend.scripts.import_.courses import",
    "import backend.auto_import_courses": "import backend.scripts.import_.courses",
    "from backend.tools.create_admin import": "from backend.db.cli.admin import",
    "from backend.tools.reset_db import": "from backend.db.cli.schema import",
    "from backend.tools.check_schema_drift import": "from backend.db.cli.schema import",
    "from backend.tools.verify_schema import": "from backend.db.cli.schema import",
    "from backend.tools.check_secret import": "from backend.db.cli.diagnostics import",
    "from backend.tools.validate_first_run import": "from backend.db.cli.diagnostics import",
    "from backend.tools.create_test_data import": "from backend.db.cli.test_data import",
    "from backend.tools.backup_db import": "from backend.db.cli.backup import",
    "from backend.tools.restore_db import": "from backend.db.cli.backup import",
    "from backend.tools.export_data import": "from backend.db.cli.export import",
}

def migrate_file(file_path: Path) -> tuple[bool, int]:
    """Migrate imports in a single file."""
    content = file_path.read_text(encoding='utf-8')
    original = content
    changes = 0

    for old, new in MIGRATIONS.items():
        if old in content:
            content = content.replace(old, new)
            changes += content.count(new) - original.count(new)

    if content != original:
        file_path.write_text(content, encoding='utf-8')
        return True, changes

    return False, 0

def main(directory: str = "."):
    """Scan directory and migrate all Python files."""
    root = Path(directory)
    total_files = 0
    total_changes = 0

    print(f"Scanning {root.absolute()} for deprecated imports...")

    for py_file in root.rglob("*.py"):
        if ".venv" in str(py_file) or "node_modules" in str(py_file):
            continue

        modified, changes = migrate_file(py_file)
        if modified:
            total_files += 1
            total_changes += changes
            print(f"✓ Updated {py_file.relative_to(root)} ({changes} changes)")

    print(f"\n✓ Migration complete: {total_files} files updated, {total_changes} total changes")

    if total_files == 0:
        print("No deprecated imports found - you're already using $11.14.0 paths!")

if __name__ == "__main__":
    directory = sys.argv[1] if len(sys.argv) > 1 else "."
    main(directory)
```

**Usage:**
```bash
# Run from repository root
python migrate_imports.py .

# Or for specific directory
python migrate_imports.py ./my_scripts/
```

---

## Testing Migration

After updating imports, verify everything works:

### 1. Static Analysis
```bash
# Check for syntax errors
python -m py_compile path/to/your/script.py

# Type checking (if using mypy)
mypy path/to/your/script.py
```

### 2. Import Validation
```bash
# Verify new imports work
python -c "from backend.scripts.import_.courses import import_courses; print('✓ Course import OK')"
python -c "from backend.db.cli.admin import create_admin_user; print('✓ Admin tools OK')"
python -c "from backend.db.cli.schema import reset_database; print('✓ Schema tools OK')"
```

### 3. Functional Testing
```bash
# Run your scripts in test environment
python your_custom_script.py --dry-run

# Run application test suite
cd backend && pytest -v
```

---

## Rollback Plan

If you encounter issues and need to rollback to $11.14.0:

### Docker Users:
```bash
# Pull $11.14.0 image
docker pull your-registry/sms:1.12.9

# Or rebuild from tag
git checkout $11.14.0
docker-compose build
docker-compose up -d
```

### Native Users:
```bash
# Checkout $11.14.0
git checkout $11.14.0

# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# Start application
.\NATIVE.ps1 -Start
```

---

## FAQ

### Q: Do I need to migrate my database?
**A:** No! This release only affects Python import paths. No database changes required.

### Q: Will my existing Docker volumes work?
**A:** Yes! Docker volumes are fully compatible. Only code imports changed.

### Q: What if I'm using the web UI only?
**A:** No action needed. This only affects custom Python scripts/automation.

### Q: How do I find all affected files?
**A:** Use grep:
```bash
grep -r "backend.auto_import_courses" --include="*.py" .
grep -r "backend.tools" --include="*.py" .
```

### Q: Can I still use $11.14.0?
**A:** Yes, $11.14.0 remains fully functional with deprecated modules. However, we recommend migrating to $11.14.0 for ongoing support.

### Q: Will there be more breaking changes?
**A:** No deprecated code remains after $11.14.0. Future releases will maintain backward compatibility unless major architectural changes are needed.

---

## Support

**Issues or Questions?**
- Open an issue: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- Tag: `migration`, `$11.14.0`
- Include: Error messages, affected code snippets

**Additional Resources:**
- [CHANGELOG.md](../../CHANGELOG.md) - Full release notes
- [Cleanup Report](../releases/reports/CLEANUP_EXECUTION_REPORT_$11.14.0.md) - Technical details
- [Backend CLI Reference](../development/BACKEND_CLI_REFERENCE.md) - New tool documentation

---

*Last Updated: December 29, 2025*
*Version: 1.13.0*
