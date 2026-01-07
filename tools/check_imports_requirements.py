#!/usr/bin/env python3
"""Legacy wrapper for the unified import checker.

This module preserves the historical ``tools/check_imports_requirements.py`` entry
point by delegating to the consolidated validator located at
``scripts/utils/validators/import_checker.py``.

The wrapper keeps backwards compatibility for automation, CI, and developer
workflows that still invoke the old path. All new tooling should import or
execute the consolidated validator directly.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_CHECKER = ROOT / "scripts" / "utils" / "validators" / "import_checker.py"


def _load_import_checker():
    """Dynamically load the consolidated import checker module."""
    if not IMPORT_CHECKER.exists():
        raise FileNotFoundError(
            f"Unified import checker is missing at expected location: {IMPORT_CHECKER}"
        )

    spec = importlib.util.spec_from_file_location("import_checker", str(IMPORT_CHECKER))
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load consolidated import checker module")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    """Execute the consolidated import checker with current CLI arguments."""
    module = _load_import_checker()
    # Delegate to the new script's main() which handles argument parsing.
    # The consolidated script terminates via SystemExit, so capture that to
    # provide the legacy return-code behavior expected by older tooling/tests.
    try:
        result = module.main()
    except SystemExit as exc:  # pragma: no cover - handled in tests
        code = exc.code if exc.code is not None else 0
        return int(code)

    if isinstance(result, int):
        return result
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
