# Contributing to Student Management System

Welcome — thanks for contributing! This short guide helps maintainers and contributors adopt the project's recommended pre-commit validations and local workflow.

## Pre-commit validation (recommended)

This repository uses a unified pre-commit validation helper: `COMMIT_READY.ps1`.
Run it before committing to ensure code quality and tests pass:

PowerShell (recommended):

```powershell
.\COMMIT_READY.ps1 -Mode quick
# or
.\COMMIT_READY.ps1 -Mode standard
```

The script runs linting (Ruff/ESLint), tests (pytest/Vitest), translation checks and optional health checks (full mode).

## DEV_EASE policy (important)

`DEV_EASE` is an opt-in developer convenience flag that is strictly reserved for local pre-commit behavior. It exists to allow developers to intentionally skip tests/cleanup or enable AutoFix during local pre-commit runs.

DO NOT set `DEV_EASE` to change runtime behavior for the backend or frontend. NEVER enable `DEV_EASE` in CI pipelines or production. Example: PowerShell `$env:DEV_EASE = 'true'` (only to be used locally with COMMIT_READY).

## Git hooks (optional but recommended)

We provide a sample pre-commit hook `.githooks/commit-ready-precommit.sample` that runs `COMMIT_READY.ps1 -Mode quick` automatically before each commit.

Install the sample hooks with the repository helper scripts:

PowerShell (Windows):

```powershell
pwsh ./scripts/install-git-hooks.ps1
```

POSIX (macOS / Linux):

```bash
./scripts/install-git-hooks.sh
```

You may pass `-Force` or `--force` respectively to overwrite any existing hooks.

## Local testing and development

1. Create and activate virtual environment in `backend/`.
2. Install development dependencies: `pip install -r backend/requirements-dev.txt`.
3. Run `COMMIT_READY.ps1` regularly — it is the canonical pre-commit validator.

## CI & repository policy

- CI will run pre-commit checks automatically — do not try to enable DEV_EASE in CI.
- Keep the `COMMIT_READY` checks green to avoid breaking CI.

### COMMIT_READY cleanup notes

The `COMMIT_READY.ps1` script includes an automated cleanup stage which performs a safe, bounded cleanup
of Python caches, Node caches, build artifacts and temporary files. A few important details:

- The cleanup has a safety timeout (default 120s) to avoid scanning extremely large folders or mounted volumes.
- Large directories such as `.git`, `node_modules`, `.venv`, `venv`, `backups`, `data`, `logs`, and `docker` are excluded from deep recursive pruning.
- To run only the cleanup phase use `COMMIT_READY.ps1 -Mode cleanup`. When running in `cleanup` mode the process exit code is based solely on the cleanup results so CI smoke checks can rely on verifying the filesystem state after the script runs (the repo includes a smoke test workflow in `.github/workflows`).

- Note: Files that are currently in-use by another process (for example a VS Code extension or testing harness keeping a handle open) cannot be removed on some platforms — especially Windows. The cleanup step will detect these and mark the cleanup as failed; to remove them you must stop the owning process or close the open handle first. CI smoke tests intentionally create removable files, but local dev environments may need to terminate processes that lock temporary files.

Thank you for keeping the codebase healthy and production-ready.
