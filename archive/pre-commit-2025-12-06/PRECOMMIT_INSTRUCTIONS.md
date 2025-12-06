# Pre-commit hook: install and enable

This repository includes a minimal `.pre-commit-config.yaml` that runs a local
hook to verify backend imports are declared in `backend/requirements.txt`.

Recommended setup (developer machine):

1. Install pre-commit (system-wide or in your user environment):

```powershell
# Windows (PowerShell)
python -m pip install --user pre-commit
# or for system-wide
python -m pip install pre-commit
```

2. Install the hooks into your local repo (run once per clone):

```powershell
cd "d:\SMS\student-management-system"
pre-commit install
```

3. Optionally run the hooks against all files once to validate:

```powershell
pre-commit run --all-files
```

Notes:

- The checker runs using your system Python environment. If you prefer an
  isolated environment, consider creating a small venv and activating it before
  running `pre-commit`.
- CI runs a dedicated job that installs `backend/requirements.txt` before
  executing the checker; local runs may fail if you don't have the same
  packages installed. If that happens, either install the relevant packages or
  run the checker inside a venv with the backend requirements installed.

## Additional helper: repository-provided pre-commit hook sample

This project provides a small sample pre-commit hook at `.githooks/commit-ready-precommit.sample`.
It invokes `COMMIT_READY.ps1 -Mode quick` locally so your commit will automatically run the
consolidated pre-commit checks (lint, tests, translation parity, etc.). To install the sample
hook either copy it to `.git/hooks/pre-commit` and make it executable or use the included install
scripts in `scripts/`:

PowerShell (Windows)

```powershell
pwsh ./scripts/install-git-hooks.ps1
# add -Force to overwrite existing hooks
```

POSIX (macOS / Linux)

```bash
./scripts/install-git-hooks.sh
# or ./scripts/install-git-hooks.sh --force
```

Important: DEV_EASE is strictly a pre-commit-only helper and **must not** be used to alter runtime
behavior of the backend or frontend. Set `DEV_EASE=true` only when you intentionally want to allow
COMMIT_READY to skip tests/cleanup or to AutoFix during *local* pre-commit runs. CI and production
must remain strict and should never enable DEV_EASE.
