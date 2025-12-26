import warnings
from backend.scripts.import_.courses import check_and_import_courses, wait_for_server

"""DEPRECATED: Use backend.scripts.import_.courses instead.

This module is deprecated and maintained for backward compatibility only.
All new code should import from backend.scripts.import_.courses.

Migration path:
    OLD: from backend.auto_import_courses import check_and_import_courses, wait_for_server
    NEW: from backend.scripts.import_ import check_and_import_courses, wait_for_server
"""

warnings.warn(
    "backend.auto_import_courses is deprecated. " "Use backend.scripts.import_.courses instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export for backward compatibility
__all__ = ["check_and_import_courses", "wait_for_server"]
