"""
DEPRECATED: tools/ module is being consolidated into scripts/utils/

This package is kept for backward compatibility only. All functionality has been
moved to scripts/utils/ and is organized by function:

    scripts/utils/
    ├── backups/         - Backup utilities
    ├── ci/              - CI/CD tools
    ├── converters/      - Data conversion tools
    ├── lint/            - Linting utilities
    ├── installers/      - Installer scripts
    ├── tests/           - Test utilities
    ├── validators/      - Validation tools
    └── *.py             - General utilities

MIGRATION GUIDE:

    from tools import check_imports
    ↓
    python scripts/utils/validators/import_checker.py

    from tools.converters import convert_mieek_to_import
    ↓
    from scripts.utils.converters.convert_mieek_to_import import ...

    Tools are now discovered through their function-based organization:
    - Import validation: scripts/utils/validators/
    - Data conversion: scripts/utils/converters/
    - Backup management: scripts/utils/backups/
    - CI tools: scripts/utils/ci/
    - Linting: scripts/utils/lint/
    - Installation: scripts/utils/installer/

See scripts/utils/README.md for detailed documentation.
"""

import warnings

# Show consolidation warning
warnings.warn(
    "The tools/ module is deprecated and being consolidated into scripts/utils/. "
    "See scripts/utils/README.md for the new organization.",
    DeprecationWarning,
    stacklevel=2,
)

__all__ = []
