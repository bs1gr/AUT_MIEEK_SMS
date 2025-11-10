# run_mypy_per_file.py

Purpose
-------
`run_mypy_per_file.py` is a small helper script that runs `mypy` on each Python source file separately. It is useful for Windows developer environments where a full repository mypy run can fail when the Python tooling traverses files or paths with Windows-reserved device names (for example, a file named `nul`). Running mypy per-file avoids scanning the repository root and these corner cases while still providing type-checking feedback for each file.

When to use
-----------
- You're on Windows and `mypy .` fails due to filesystem traversal errors.
- You want a quick per-file type-check to validate changes without running a full repo-wide mypy.

Usage (PowerShell)
------------------
From the repository root run:

```powershell
cd D:/SMS/student-management-system
python tools/run_mypy_per_file.py
```

Notes
-----
- The script runs `mypy` once per file and reports per-file results. It prints a final summary when finished.
- This helper is intended as a developer convenience on Windows. The CI (GitHub Actions) runs a full mypy check on Linux runners; fixes required by CI should be applied and pushed to the repository.
- If you'd like I can add a tiny `powershell` wrapper or a `Makefile` entry for convenience.

Contact
-------
If you see a failing file reported by this script but the CI still passes, open an issue so we can investigate platform differences.

