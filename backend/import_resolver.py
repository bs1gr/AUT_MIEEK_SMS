"""Lightweight import resolver used to prefer package-qualified imports
and fall back to bare module names. This helps running the code both
as a package (recommended) and as a script during development/test runs.

Usage:
    from backend.import_resolver import import_names
    Student, = import_names('models', 'Student')
"""
from __future__ import annotations

from typing import Any, Tuple
import importlib
import importlib.util
import logging

logger = logging.getLogger(__name__)


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
        raise ImportError(f"Could not import '{module_basename}' from {candidates}: {last_exc}")
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
            raise ImportError(f"Module '{module.__name__}' has no attribute '{n}'") from exc
    return tuple(result)
