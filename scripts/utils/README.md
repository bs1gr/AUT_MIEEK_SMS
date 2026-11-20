# scripts/utils - General Utilities

This directory consolidates general utility scripts and tools for the Student Management System.

## Purpose

Provides shared utilities for importing, validation, conversion, and system diagnostics that don't fit into specific operational categories (ci/, dev/, ops/, etc.).

## Directory Structure

```
utils/
├── converters/             # Data format converters + sample inputs
│   ├── convert_mieek_to_import.py
│   ├── convert_pdf_to_import.py
│   └── example_input_*.json
├── installer/              # Installer utilities (legacy wizard assets)
├── lint/                   # Linting and formatting tools (markdown, mypy helper)
├── ci/                     # CI helpers (issue monitors, quick listings)
├── backups/                # Backup utility helpers
├── post_register.py        # Post-registration hooks
├── release.py              # Release utilities
└── README.md              # This file
```

## Available Utilities

### Converters

#### convert_mieek_to_import.py

Convert student/course data from MIEEK format to SMS import format.

```bash
python scripts/utils/converters/convert_mieek_to_import.py \
  --input data.xlsx \
  --output import_ready.json
```

Sample inputs are provided in `converters/example_input_*.json`.

#### convert_pdf_to_import.py

Convert PDF documents to SMS import format.

```bash
python scripts/utils/converters/convert_pdf_to_import.py \
  --input grades.pdf \
  --output grades.json
```

### Installers

Located in `installer/` subdirectory - utilities for installer creation and validation (legacy PS2EXE/GUI wizards now consolidated here).

### Linting Tools

Located in `lint/` subdirectory - utilities for code quality and formatting.

## Consolidation Notes

This directory was created as part of workspace consolidation in v1.10.1 to unify
utility organization. Items previously in the root `tools/` directory have been
migrated here with backward-compatible stubs left in `tools/`.

### Migration Status

- ✅ Directory structure created (v1.10.1)
- ✅ File migration (v1.11.0 Phase 1)
- ✅ Import path updates with backward-compatible shims (v1.11.0)
- ✅ CI/backup utilities migrated from `tools/` (v1.11.0 Phase 1)

### Backward Compatibility

The legacy `tools/` entry points have been retired. The import validator
(`validators/import_checker.py`) was removed in November 2026: it scanned a
`backend/` folder that has not existed since the June 2026 flatten, and nothing
ran it.

## Usage in Scripts

To use utilities from scripts:

```python
import sys
sys.path.insert(0, 'scripts/utils')

from converters.convert_mieek_to_import import convert_mieek

# Use utilities
convert_mieek('data.xlsx', 'output.json')
```

## Adding New Utilities

When adding new utilities:

1. Choose appropriate subdirectory (converters/, ci/, etc.)
2. Follow naming convention: `tool_name.py`
3. Include docstring with purpose and usage
4. Add entry to this README.md
5. Add unit tests under `src/backend/tests/` if applicable (the batch runner finds them there)

Example structure for new utility:

```python
"""
tool_name.py - Brief description

Purpose:
    Detailed description of what tool does

Usage:
    python scripts/utils/tool_name.py --option value

Options:
    --option    Description of option
"""

import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--option', help='Option description')
    args = parser.parse_args()

    # Implementation

if __name__ == '__main__':
    main()
```

## Related Documentation

- `CONSOLIDATION_MAP.md` - Detailed migration plan
- `../README.md` - Parent scripts directory
- `../../WORKSPACE_CONSOLIDATION_ANALYSIS.md` - Full workspace analysis

---

**Created:** December 9, 2025
**Status:** Structure established, migrations complete for Phase 1
**Consolidation Phase:** v1.10.1 (planning), v1.11.0 (implementation)
