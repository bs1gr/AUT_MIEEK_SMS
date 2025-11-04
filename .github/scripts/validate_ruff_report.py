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


def maybe_validate_schema(data: object, cwd: Path) -> None:
    """If a JSON Schema is present and jsonschema is installed, validate.

    This is optional: if the schema file is missing or jsonschema is not
    available, this function will return without failing.
    """
    schema_path = cwd / ".github" / "schema" / "ruff-report.schema.json"
    if not schema_path.exists():
        # No schema to validate against
        return

    try:
        import jsonschema  # type: ignore
    except Exception:  # pragma: no cover - only runs when jsonschema is present
        print("INFO: jsonschema not installed; skipping schema validation")
        return

    try:
        schema = json.loads(schema_path.read_text())
    except Exception as exc:
        fail(f"Failed to load JSON Schema {schema_path}: {exc}")

    try:
        jsonschema.validate(instance=data, schema=schema)
    except Exception as exc:
        fail(f"JSON Schema validation failed: {exc}")


def main() -> None:
    # The script is intended to be run from the repository root in CI; it
    # will look for `backend/ruff-report.json` relative to the current
    # working directory.
    cwd = Path.cwd()
    out = Path("backend") / "ruff-report.json"

    if not out.exists():
        fail(f"Missing expected artifact: {out}")

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

    # Optional JSON Schema validation (if schema present and jsonschema installed)
    maybe_validate_schema(data, cwd)

    # If we got here, consider it valid
    print(f"VALID: {out} parsed OK, {len(data['issues'])} issues present")


if __name__ == "__main__":
    main()
