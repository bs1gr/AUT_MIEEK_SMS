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

This structure consolidates former root-level \	ools/\ directory into 
\scripts/utils/\ for unified utility organization.

**Current:** Both scripts/ and tools/ directories exist  
**Target:** All utilities under scripts/utils/  
**Backward Compat:** Old tools/ path still valid (imports aliased)

## Files to Migrate (Phase 1)

- [ ] tools/check_imports.py → scripts/utils/validators/import_checker.py
- [ ] tools/check_imports_requirements.py → scripts/utils/validators/
- [ ] tools/convert_*.py → scripts/utils/converters/
- [ ] tools/post_register.py → scripts/utils/
- [ ] tools/release.py → scripts/utils/
- [ ] tools/installer/ → scripts/utils/installer/
- [ ] tools/lint/ → scripts/utils/lint/
- [ ] tools/tests/ → scripts/utils/tests/

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
Status: Structure created, migration pending
