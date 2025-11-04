#!/usr/bin/env python3
"""Validate the normalized Ruff JSON artifact.

This script ensures `backend/ruff-report.json` exists, is valid JSON,
and contains the expected top-level keys with correct types.

Exit codes:
 - 0 = valid
 - 2 = missing or invalid
"""
from __future__ import annotations
import json
import sys
from pathlib import Path


def fail(msg: str) -> None:
    print("ERROR:", msg, file=sys.stderr)
    sys.exit(2)


def main() -> None:
    root = Path("backend")
    out = root / "ruff-report.json"

    if not out.exists():
        fail(f"Missing expected artifact: {out}")

    data = {}
    try:
        data = json.loads(out.read_text())
    except Exception as exc:  # pragma: no cover - defensive for CI
        fail(f"Failed to parse JSON from {out}: {exc}")

    # Basic shape assertions
    if not isinstance(data, dict):
        fail("Top-level JSON must be an object/dict")

    if "ruff_version" not in data or not isinstance(data["ruff_version"], str):
        fail("Missing or invalid 'ruff_version' (expected string)")

    if "issues" not in data or not isinstance(data["issues"], list):
        fail("Missing or invalid 'issues' (expected list)")

    # stdout/stderr are optional but should be strings if present
    for k in ("stdout", "stderr"):
        if k in data and not isinstance(data[k], str):
            fail(f"Field '{k}' exists but is not a string")

    # If we got here, consider it valid
    print(f"VALID: {out} parsed OK, {len(data['issues'])} issues present")


if __name__ == "__main__":
    main()
