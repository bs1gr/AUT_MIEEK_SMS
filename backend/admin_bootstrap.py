import warnings
from backend.scripts.admin.bootstrap import ensure_default_admin_account

"""DEPRECATED: Use backend.scripts.admin.bootstrap instead.

This module is deprecated and maintained for backward compatibility only.
All new code should import from backend.scripts.admin.bootstrap.

Migration path:
    OLD: from backend.admin_bootstrap import ensure_default_admin_account
    NEW: from backend.scripts.admin import ensure_default_admin_account
"""

warnings.warn(
    "backend.admin_bootstrap is deprecated. " "Use backend.scripts.admin.bootstrap instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export for backward compatibility
__all__ = ["ensure_default_admin_account"]
