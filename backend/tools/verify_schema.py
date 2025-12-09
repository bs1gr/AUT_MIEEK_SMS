"""
DEPRECATED: Use backend.db.cli.schema instead.

This module is kept for backward compatibility only. All functionality has been
moved to backend.db.cli.schema.

Migration guide:
  OLD: from backend.tools import verify_schema
  NEW: from backend.db.cli import verify_schema
"""

import warnings
import sys
import os

# Ensure repository root on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import from new location
from backend.db.cli.schema import verify_schema

# Show deprecation warning
warnings.warn(
    "backend.tools.verify_schema is deprecated. Use backend.db.cli.schema instead.",
    DeprecationWarning,
    stacklevel=2,
)

__all__ = ["verify_schema"]
