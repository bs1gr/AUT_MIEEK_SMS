"""
DEPRECATED: moved to scripts/utils/release.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    target = root / "scripts" / "utils" / "release.py"
    cmd = [sys.executable, str(target), *sys.argv[1:]]
    print("[DEPRECATED] Redirecting to scripts/utils/release.py")
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
