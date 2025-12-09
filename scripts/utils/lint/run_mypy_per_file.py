"""Run mypy on each .py file under backend individually to avoid path scanning issues on Windows."""

import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
backend = root / "backend"

py_files = list(backend.rglob("*.py"))
if not py_files:
    print("No python files found under backend")
    sys.exit(0)

ok = True
for p in py_files:
    print("Running mypy on", p)
    cmd = [sys.executable, "-m", "mypy", "--config-file", str(root / "mypy.ini"), str(p)]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(res.stdout)
    if res.returncode != 0:
        ok = False

if not ok:
    print("One or more files failed mypy")
    sys.exit(1)
print("All files passed mypy (per-file).")
