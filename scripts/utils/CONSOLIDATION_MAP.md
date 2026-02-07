# Scripts/Utils Consolidation Map

## Directory Structure

\\\
scripts/
├── ci/                          # CI/CD automation
├── dev/                         # Development utilities
├── maintenance/                 # System maintenance
├── ops/                         # Operations/releases
├── lib/                         # Shared PowerShell libraries
├── utils/                       # General utilities (formerly tools/)
│   ├── validators/
│   │   ├── check_imports.py     (unified import validator)
│   │   └── schema_validator.py
│   ├── converters/
│   │   ├── convert_mieek_to_import.py
│   │   └── convert_pdf_to_import.py
│   ├── post_register.py
│   ├── release.py
│   ├── check_*.py               (diagnostic tools)
│   ├── installer/               (installer utilities)
│   ├── lint/                    (linting tools)
│   ├── tests/                   (test utilities)
│   └── README.md
└── lib/
    └── cleanup_common.ps1
\\\

## Migration Status

This structure consolidates former root-level tools/ directory into
\scripts/utils/\ for unified utility organization.

**Current:** scripts/utils/ is canonical; tools/ contains limited helpers only
**Target:** All utilities under scripts/utils/
**Backward Compat:** Legacy import-checker wrappers removed

## Files to Migrate (Phase 1)

- [x] tools/check_imports.py → scripts/utils/validators/import_checker.py (removed legacy stub)
- [x] tools/check_imports_requirements.py → scripts/utils/validators/import_checker.py (removed legacy stub)
- [x] tools/convert_*.py → scripts/utils/converters/
- [x] tools/post_register.py → scripts/utils/
- [x] tools/release.py → scripts/utils/
- [x] tools/installer/ → scripts/utils/installer/
- [x] tools/lint/ → scripts/utils/lint/
- [x] tools/tests/ → scripts/utils/tests/
- [x] tools/backup_tools.ps1 → scripts/utils/backups/ (stub redirect)
- [x] tools/ci_list_now.ps1 → scripts/utils/ci/ (stub redirect)
- [x] tools/monitor_ci_issues.ps1 → scripts/utils/ci/ (stub redirect)
- [x] tools/import_name_mapping.json → scripts/utils/ci/
- [x] tools/runs.json → scripts/utils/ci/

## Import Path Changes

Before:
\\\python
sys.path.insert(0, 'tools')
from check_imports import validate_imports
\\\

After:
\\\python
sys.path.insert(0, 'scripts/utils')
from validators.import_checker import validate_imports
\\\

## Related Consolidations

- **backend/db/** - Group all DB utilities (future)
- **config/** - Centralize configuration files (future)
- **SMS.ps1** - Root-level meta-wrapper (future)

---
Generated: 2025-12-09
Status: Structure created, migration completed
