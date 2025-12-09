# scripts/utils - General Utilities

This directory consolidates general utility scripts and tools for the Student Management System.

## Purpose

Provides shared utilities for importing, validation, conversion, and system diagnostics that don't fit into specific operational categories (ci/, dev/, ops/, etc.).

## Directory Structure

```
utils/
├── validators/              # Input and system validation
│   ├── check_imports.py    # Unified import validator
│   └── schema_validator.py # Database schema validation
├── converters/             # Data format converters
│   ├── convert_mieek_to_import.py
│   ├── convert_pdf_to_import.py
│   └── example_input_*.json
├── installer/              # Installer utilities
├── lint/                   # Linting and formatting tools
├── tests/                  # Test utilities
├── post_register.py        # Post-registration hooks
├── release.py              # Release utilities
└── README.md              # This file
```

## Available Utilities

### Validators

#### check_imports.py (Unified Import Validator)

**Purpose:** Validate Python import consistency across the project

**Usage:**

```bash
# Check all import types
python scripts/utils/validators/check_imports.py

# Check specific mode
python scripts/utils/validators/check_imports.py --mode requirements
python scripts/utils/validators/check_imports.py --mode backend
python scripts/utils/validators/check_imports.py --mode package
```

**Modes:**
- `requirements` - Validate requirements.txt coverage
- `backend` - Validate backend.db imports
- `package` - Validate package imports
- `all` - Check everything (default)

### Converters

#### convert_mieek_to_import.py

Convert student/course data from MIEEK format to SMS import format.

```bash
python scripts/utils/converters/convert_mieek_to_import.py \
  --input data.xlsx \
  --output import_ready.json
```

#### convert_pdf_to_import.py

Convert PDF documents to SMS import format.

```bash
python scripts/utils/converters/convert_pdf_to_import.py \
  --input grades.pdf \
  --output grades.json
```

### Installers

Located in `installers/` subdirectory - utilities for installer creation and validation.

### Linting Tools

Located in `lint/` subdirectory - utilities for code quality and formatting.

### Test Utilities

Located in `tests/` subdirectory - helper utilities for testing and validation.

## Consolidation Notes

This directory was created as part of workspace consolidation in v1.10.1 to unify 
utility organization. Items previously in the root `tools/` directory are being 
migrated here.

### Migration Status

- ✅ Directory structure created (v1.10.1)
- ⏳ File migration (planned for v1.11.0)
- ⏳ Import path updates (planned for v1.11.0)

### Backward Compatibility

During migration:
- Original root `tools/` directory maintained (deprecated)
- Import aliases available for backward compatibility
- Full deprecation period planned for v1.12.0+

## Usage in Scripts

To use utilities from scripts:

```python
import sys
sys.path.insert(0, 'scripts/utils')

from validators.import_checker import validate_imports
from converters.convert_mieek_to_import import convert_mieek

# Use utilities
validate_imports()
convert_mieek('data.xlsx', 'output.json')
```

## Adding New Utilities

When adding new utilities:

1. Choose appropriate subdirectory (validators/, converters/, etc.)
2. Follow naming convention: `tool_name.py`
3. Include docstring with purpose and usage
4. Add entry to this README.md
5. Include unit tests in `tests/` if applicable

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
**Status:** Structure established, migrations in progress  
**Consolidation Phase:** v1.10.1 (planning), v1.11.0 (implementation)
