"""Centralized import resolution utilities.

Provides two complementary mechanisms:

1) ensure_backend_importable():
     - Adds the project root to sys.path so that absolute imports like
         ``from backend.config import settings`` work consistently across
         execution modes (Docker, native dev, tests).

2) import_names():
     - Lightweight helper used to prefer package-qualified imports and
         fall back to bare module names when necessary. This helps running
         the code both as a package (recommended) and as a script during
         development/test runs.

Usage:
        from backend.import_resolver import ensure_backend_importable, import_names
        ensure_backend_importable()
        from backend.config import settings
        Student, = import_names('models', 'Student')
"""

from __future__ import annotations

import sys
import importlib
import importlib.util
import logging
from pathlib import Path
from typing import Any, Tuple

logger = logging.getLogger(__name__)


def ensure_backend_importable() -> None:
    """Add project root to sys.path so 'backend.*' imports always work.

    Computes project root as two levels up from this file
    (project_root/backend/import_resolver.py -> project_root) and
    inserts it at position 0 if missing to prioritize local project.
    """
    try:
        project_root = Path(__file__).resolve().parents[1]
        project_root_str = str(project_root)
        if project_root_str not in sys.path:
            sys.path.insert(0, project_root_str)
    except Exception:  # pragma: no cover - defensive
        # Fail silently; callers may have already set up sys.path
        pass


def import_from_possible_locations(module_basename: str):
    """Try to import 'backend.<module_basename>' first then '<module_basename>'.

    Returns the imported module or raises ImportError if none found.
    """
    candidates = [f"backend.{module_basename}", module_basename]
    last_exc: Exception | None = None
    for name in candidates:
        try:
            spec = importlib.util.find_spec(name)
            if spec is None:
                # Not importable in this environment
                continue
            module = importlib.import_module(name)
            return module
        except Exception as exc:  # pragma: no cover - defensive
            last_exc = exc
            logger.debug("import %s failed: %s", name, exc)

    if last_exc:
        raise ImportError(
            f"Could not import '{module_basename}' from {candidates}: {last_exc}"
        )
    raise ImportError(f"Could not import '{module_basename}' from {candidates}")


def import_names(module_basename: str, *names: str) -> Tuple[Any, ...]:
    """Import a module using import_from_possible_locations and return the requested attribute(s).

    Example:
        Student, = import_names('models', 'Student')
    """
    module = import_from_possible_locations(module_basename)
    result: list[Any] = []
    for n in names:
        try:
            result.append(getattr(module, n))
        except AttributeError as exc:  # pragma: no cover - defensive
            raise ImportError(
                f"Module '{module.__name__}' has no attribute '{n}'"
            ) from exc
    return tuple(result)
