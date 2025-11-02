Import-resolver sweep & CI enforcement - 2025-11-02

Small internal maintenance release that improves import robustness and CI enforcement.

Highlights:

- Centralized import fallback logic with `backend/import_resolver.py` and replaced ad-hoc try/except import patterns across backend modules.
- Enforced static checks in CI: added `ruff` workflow and made `mypy` blocking in CI.
- Made secret guard blocking on `main` (CI job will fail if `SECRET_KEY` missing or uses placeholder); PRs still get an informational check.
- Added pre-commit hooks configuration (ruff/isort and file-cleanup hooks) to help contributors maintain code quality.
- Deleted stale remote feature branch `chore/import-resolver-sweep` after merge.

Technical:

- Files added: `backend/import_resolver.py`, `.github/workflows/ruff.yml` (CI), pre-commit configuration updates
- Files modified: many backend routers to use import_resolver, `.github/workflows/mypy.yml`, `.github/workflows/secret-guard.yml`
- Tests: backend pytest runs hermetically using in-memory SQLite and pass on main

Notes:

- This is primarily a developer-facing maintenance change; no API or schema changes were introduced.
