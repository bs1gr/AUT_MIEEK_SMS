#!/usr/bin/env python3
"""Clean venv wrapper for testing.

Usage:
  python scripts/run_in_venv_clean.py --install-deps -- tools/check_imports_requirements.py
"""

from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENV_DIR = ROOT / ".venv-tools"


def ensure_venv(venv_dir: Path) -> Path:
    if not venv_dir.exists():
        print(f"Creating virtualenv at {venv_dir} ...")
        subprocess.check_call([sys.executable, "-m", "venv", str(venv_dir)])
    if sys.platform.startswith("win"):
        python_bin = venv_dir / "Scripts" / "python.exe"
    else:
        python_bin = venv_dir / "bin" / "python"
    return python_bin


def main(argv: list[str]) -> int:
    install_deps = False
    if "--install-deps" in argv:
        install_deps = True
        argv = [a for a in argv if a != "--install-deps"]
    if "--" in argv:
        idx = argv.index("--")
        cmd = argv[idx + 1 :]
    else:
        cmd = []
    if not cmd:
        print("Usage: run_in_venv_clean.py [--install-deps] -- <command> [args...]", file=sys.stderr)
        return 2
    py = ensure_venv(VENV_DIR)
    if install_deps:
        print("Installing backend requirements into venv...")
        reqs = ROOT / "backend" / "requirements.txt"
        if reqs.exists():
            rc = subprocess.call([str(py), "-m", "pip", "install", "-r", str(reqs)])
            if rc != 0:
                print("Failed to install requirements into venv", file=sys.stderr)
                return rc
        else:
            print(f"Requirements file not found: {reqs}")
    if cmd and cmd[0] in ("python", "python3"):
        cmd = cmd[1:]
    full = [str(py)] + cmd
    print("Running in venv:", " ".join(full))
    return subprocess.call(full)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
