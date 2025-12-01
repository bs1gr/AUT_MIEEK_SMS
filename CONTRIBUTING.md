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

Thank you for keeping the codebase healthy and production-ready.
