Windows-reserved filename workaround
===================================

Why this file exists
---------------------

During local type-check and lint runs on Windows, the Python type-checker can fail when the repository contains files whose names conflict with Windows reserved device names (for example `nul`). To allow the team to run checks locally on Windows without changing repository structure or content, the branch briefly introduced placeholder files named `nul_ignored` while the team performed a clean-first lint/mypy sweep.

What we changed
---------------

- The temporary placeholders were used only to avoid hitting the OS device-name edge case during directory scans.
- Those placeholders have now been removed from the repository to keep the mainline clean.

Recommendation
--------------

If contributors run into similar problems on Windows in the future, prefer one of these approaches:

1. Run mypy/linters per-file (the project includes `tools/run_mypy_per_file.py`) to avoid directory-traversal issues with special filenames.
2. Run the type-checker inside CI (Linux) where reserved device-name collisions do not occur.
3. Use a temporary local branch to rename offending files during checks (do not commit device-name renames to origin).

If you'd like, I can add a small helper to the `README.md` describing how to run the per-file mypy runner on Windows.

Status: placeholders removed on 2025-11-10 in commit that merged lint/mypy cleanup into `main`.
