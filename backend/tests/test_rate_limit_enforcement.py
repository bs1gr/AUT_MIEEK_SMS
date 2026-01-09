from __future__ import annotations

import ast
from pathlib import Path

"""Test ensuring all write endpoints are protected by rate limiting.

This enforces the project rule: *Always add rate limiting to new endpoints.*
If a legitimate exception is required, decorate that endpoint with a comment
`# rate limit exemption` so future automation can detect intentional skips.
"""


WRITE_METHODS = {"post", "put", "delete", "patch"}
ROUTERS_DIR = Path(__file__).resolve().parent.parent / "routers"


def _decorators(func: ast.FunctionDef):
    return func.decorator_list


def _has_limit(decorators):
    for dec in decorators:
        if isinstance(dec, ast.Call):
            func = dec.func
            if isinstance(func, ast.Attribute) and func.attr == "limit":
                return True
    return False


def _is_write(decorators):
    for dec in decorators:
        if isinstance(dec, ast.Call):
            func = dec.func
            if isinstance(func, ast.Attribute) and func.attr in WRITE_METHODS:
                return True
    return False


def _is_exempt(func: ast.FunctionDef, source_lines: list[str]) -> bool:
    # Look for exemption comment immediately above function def (max 3 lines up)
    start_line = func.lineno - 2
    for i in range(max(0, start_line - 3), start_line + 1):
        line = source_lines[i].strip() if i < len(source_lines) else ""
        if line.startswith("#") and "rate limit exemption" in line.lower():
            return True
    return False


def test_write_endpoints_rate_limited():
    problems = []
    for router_file in sorted(ROUTERS_DIR.glob("routers_*.py")):
        source = router_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(router_file))
        lines = source.splitlines()
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                decs = _decorators(node)
                if _is_write(decs) and not _has_limit(decs) and not _is_exempt(node, lines):
                    problems.append(f"{router_file.name}:{node.lineno}:{node.name}")

    assert not problems, "Missing @limiter.limit on write endpoints: " + ", ".join(problems)
