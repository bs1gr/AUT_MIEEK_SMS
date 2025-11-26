"""Rate limit enforcement audit utility.

Scans backend router files for write-modifying HTTP endpoints (POST, PUT,
PATCH, DELETE) and reports any that do not include a ``@limiter.limit(...)``
decorator. Helps ensure the project policy *"Always add rate limiting to new
endpoints"* is consistently enforced.

Usage:
    python -m backend.tools.rate_limit_audit

Exit code 0 if all write endpoints are rate limited, otherwise 1.
"""

from __future__ import annotations

import ast
from pathlib import Path
from typing import List, Tuple

ROUTERS_DIR = Path(__file__).resolve().parent.parent / "routers"
WRITE_METHODS = {"post", "put", "delete", "patch"}


def _function_has_limit(decorators: List[ast.expr]) -> bool:
    for dec in decorators:
        # Looking for calls like limiter.limit(...)
        if isinstance(dec, ast.Call):
            func = dec.func
            if isinstance(func, ast.Attribute) and func.attr == "limit":
                return True
    return False


def _is_write_endpoint(decorators: List[ast.expr]) -> bool:
    for dec in decorators:
        if isinstance(dec, ast.Call):
            func = dec.func
            # Pattern: router.<method>("/path")
            if isinstance(func, ast.Attribute) and func.attr in WRITE_METHODS:
                return True
    return False


def scan_file(path: Path) -> List[Tuple[str, int]]:
    """Return list of (function_name, line_no) for unprotected write endpoints."""
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    missing: List[Tuple[str, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            if _is_write_endpoint(node.decorator_list) and not _function_has_limit(node.decorator_list):
                missing.append((node.name, node.lineno))
    return missing


def scan_all() -> List[Tuple[str, str, int]]:
    problems: List[Tuple[str, str, int]] = []
    for file in sorted(ROUTERS_DIR.glob("routers_*.py")):
        mis = scan_file(file)
        for fn, lineno in mis:
            problems.append((file.name, fn, lineno))
    return problems


def main(argv=None) -> int:
    problems = scan_all()
    if not problems:
        print("✅ All write endpoints are rate limited.")
        return 0
    print("❌ Missing @limiter.limit on the following write endpoints:")
    for filename, fn, lineno in problems:
        print(f"  - {filename}:{lineno} -> {fn}()")
    return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
