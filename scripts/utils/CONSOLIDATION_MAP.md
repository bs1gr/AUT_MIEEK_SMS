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
│   ├── converters/
│   │   ├── convert_mieek_to_import.py
│   │   └── convert_pdf_to_import.py
│   ├── post_register.py
│   ├── release.py
│   ├── check_*.py               (diagnostic tools)
│   ├── installer/               (installer utilities)
│   ├── lint/                    (linting tools)
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

- [x] tools/check_imports.py → scripts/utils/validators/import_checker.py (removed legacy stub; the validator itself was deleted in November 2026)
- [x] tools/check_imports_requirements.py → scripts/utils/validators/import_checker.py (removed legacy stub; the validator itself was deleted in November 2026)
- [x] tools/convert_*.py → scripts/utils/converters/
- [x] tools/post_register.py → scripts/utils/
- [x] tools/release.py → scripts/utils/
- [x] tools/installer/ → scripts/utils/installer/
- [x] tools/lint/ → scripts/utils/lint/
- [x] tools/tests/ → scripts/utils/tests/ (its one test went with the validator in November 2026)
- [x] tools/backup_tools.ps1 → scripts/utils/backups/ (stub redirect)
- [x] tools/ci_list_now.ps1 → scripts/utils/ci/ (stub redirect)
- [x] tools/monitor_ci_issues.ps1 → scripts/utils/ci/ (stub redirect)
- [x] tools/import_name_mapping.json → scripts/utils/ci/
- [x] tools/runs.json → scripts/utils/ci/

## Import Path Changes

Before:
\\\python
sys.path.insert(0, 'tools')
from convert_mieek_to_import import convert_mieek
\\\

After:
\\\python
sys.path.insert(0, 'scripts/utils')
from converters.convert_mieek_to_import import convert_mieek
\\\

## Related Consolidations

- **backend/db/** - Group all DB utilities (future)
- **config/** - Centralize configuration files (future)
- **SMS.ps1** - Root-level meta-wrapper (future)

---
Generated: 2025-12-09
Status: Structure created, migration completed
