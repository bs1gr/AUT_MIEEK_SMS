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
