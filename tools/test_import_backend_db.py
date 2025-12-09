"""
DEPRECATED: Use scripts/utils/validators/import_checker.py
This stub runs the unified import validator in BACKEND mode.

Example:
    python scripts/utils/validators/import_checker.py --mode backend
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    target = root / "scripts" / "utils" / "validators" / "import_checker.py"
    cmd = [sys.executable, str(target), "--mode", "backend", *sys.argv[1:]]
    print("[DEPRECATED] Redirecting to unified validator: import_checker.py --mode backend")
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
