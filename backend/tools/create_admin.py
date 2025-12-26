"""
DEPRECATED: Use backend.db.cli.admin instead.

This module is kept for backward compatibility only. All functionality has been
moved to backend.db.cli.admin.

Migration guide:
  OLD: from backend.tools import create_admin
  NEW: from backend.db.cli import create_admin
"""

import warnings
import sys
import os

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import from new location
from backend.db.cli.admin import create_admin, main

# Show deprecation warning
warnings.warn(
    "backend.tools.create_admin is deprecated. Use backend.db.cli.admin instead.",
    DeprecationWarning,
    stacklevel=2,
)

__all__ = ["create_admin", "main"]
