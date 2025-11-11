#!/usr/bin/env python3
"""Pre-commit helper: verify operator scripts contain OPERATOR-ONLY header.

This script is designed to be invoked by pre-commit as a local hook and will
check the committed files passed on argv for an OPERATOR-ONLY marker within the
first 8 lines. If any operator-script under scripts/operator/ lacks the marker
the script exits non-zero with an explanatory message.
"""

import sys
from pathlib import Path


def check_file(p: Path) -> bool:
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        print(f"Could not read file: {p}")
        return False

    # Look for OPERATOR-ONLY token in first N lines
    first_lines = "\n".join(text.splitlines()[:8])
    return "OPERATOR-ONLY" in first_lines


def main(argv: list[str]) -> int:
    if not argv:
        print("No files to check")
        return 0

    failures = []
    for p in argv:
        path = Path(p)
        # Only validate files under scripts/operator/
        try:
            rel = path.relative_to(Path.cwd())
        except Exception:
            rel = path
        if str(rel).startswith("scripts/operator/"):
            ok = check_file(path)
            if not ok:
                failures.append(str(rel))

    if failures:
        print("Operator script header missing in the following files:")
        for f in failures:
            print(f"  - {f}")
        print("\nEach operator script must contain an OPERATOR-ONLY header within the first 8 lines.")
        print("Place a top-line like: OPERATOR-ONLY: DESTRUCTIVE. This script ...")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
