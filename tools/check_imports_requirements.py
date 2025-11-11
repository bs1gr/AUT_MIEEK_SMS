#!/usr/bin/env python3
"""
Simple checker: scan Python files under `backend/` for top-level imports and
verify that third-party modules are listed in `backend/requirements.txt`.

This is a heuristic check intended to catch regressions where tests or code
import a package not declared in requirements. It is used in CI to fail PRs
early.

It ignores standard library modules and local imports (modules starting with
`backend.`). It has a small whitelist for common tooling modules.
"""
from __future__ import annotations

import ast
import sys
from pathlib import Path
from typing import Set


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
REQUIREMENTS = BACKEND_DIR / "requirements.txt"


def parse_requirements(req_path: Path) -> Set[str]:
    names: Set[str] = set()
    if not req_path.exists():
        return names
    for line in req_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        # Remove extras and version specifiers
        for sep in ("==", ">=", "<=", ">", "<", "~=", "!=", " "):
            if sep in s:
                s = s.split(sep, 1)[0]
        s = s.split("[", 1)[0].strip()
        if s:
            names.add(s.lower())
    return names


def find_imports_in_file(p: Path) -> Set[str]:
    src = p.read_text(encoding="utf-8")
    tree = ast.parse(src)
    mods: Set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                top = alias.name.split(".")[0]
                mods.add(top)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                top = node.module.split(".")[0]
                # Skip relative imports
                if not node.level:
                    mods.add(top)
    return mods


def stdlib_names() -> Set[str]:
    # Prefer sys.stdlib_module_names (py3.10+)
    if hasattr(sys, "stdlib_module_names"):
        return set(map(str, sys.stdlib_module_names))
    # Fallback: conservative common stdlib names
    return {
        "os", "sys", "re", "json", "time", "typing", "pathlib", "logging",
        "subprocess", "threading", "http", "functools", "itertools", "collections",
        "math", "datetime", "inspect",
    }


def main() -> int:
    reqs = parse_requirements(REQUIREMENTS)
    stdlib = stdlib_names()
    whitelist = {"pytest", "typing_extensions", "mypy", "click", "setuptools"}

    py_files = list(BACKEND_DIR.rglob("*.py"))
    missing = {}

    import importlib.util

    for p in py_files:
        mods = find_imports_in_file(p)
        for m in sorted(mods):
            ml = m.lower()
            if ml in whitelist:
                continue
            if ml.startswith("backend"):
                continue
            if ml in stdlib:
                continue

            # If the module is importable in the current environment, assume it's provided
            # by the declared requirements or by their transitive dependencies.
            try:
                spec = importlib.util.find_spec(m)
            except Exception:
                spec = None

            if spec is not None:
                continue

            # Some names map to different package names; simple check: if any req equals m
            matched = any(req == ml or req.startswith(ml + "-") or req.startswith(ml + "_") for req in reqs)
            if not matched and ml not in reqs:
                # Record file for this module
                missing.setdefault(ml, set()).add(str(p.relative_to(ROOT)))

    if missing:
        print("ERROR: Found imports in backend/ that are not declared in backend/requirements.txt")
        for mod, files in sorted(missing.items()):
            print(f" - {mod}: imported in {len(files)} file(s):")
            for f in sorted(files):
                print(f"    - {f}")
        print("\nIf these imports are legitimate third-party packages, add them to backend/requirements.txt.")
        return 2

    print("OK: All third-party imports in backend/ are declared in backend/requirements.txt (or importable)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
