# Release notes: Import-resolver sweep & CI enforcement (2025-11-02)

This release contains maintenance and developer-experience improvements. There are no API or database schema changes.

What changed

- Centralized import fallback logic: `backend/import_resolver.py` consolidates dynamic import behavior and reduces repeated try/except import patterns across many backend modules.
- CI enforcement:
  - Added `ruff` check workflow to the repository and ensured the repo is ruff-clean.
  - Made `mypy` run blocking in CI so type regressions fail PR checks.
- Secret guard:
  - `backend/tools/check_secret.py` now exits non-zero on missing/placeholder `SECRET_KEY`.
  - GitHub Actions: secret guard is blocking on `main` (push), and informational (non-fatal) on PRs.
- Pre-commit hooks:
  - Added/updated `.pre-commit-config.yaml` to run `ruff`, `isort`, and common file-cleanup hooks on commit.
- Cleanup:
  - Deleted remote feature branch `chore/import-resolver-sweep` after merge.

Why this matters

- Prevents fragile ad-hoc import fallbacks from causing runtime surprises in CI or production.
- Enforces code quality (formatting + types) earlier in the development flow.
- Makes missing or insecure secrets an explicit CI failure on `main`, preventing accidental releases with insecure config.

Developer notes

- To run pre-commit locally:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

- If you need the secret guard to be non-fatal for certain branches, open an issue or PR to adjust `.github/workflows/secret-guard.yml`.
