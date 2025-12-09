"""
DEPRECATED: moved to scripts/utils/find_bad_paths.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    target = root / "scripts" / "utils" / "find_bad_paths.py"
    cmd = [sys.executable, str(target), *sys.argv[1:]]
    print("[DEPRECATED] Redirecting to scripts/utils/find_bad_paths.py")
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
