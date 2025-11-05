# Developer Fast Start — Pre-commit & tests

This short guide helps developers get up and running quickly with the repository's local tooling (Windows PowerShell and Unix shells).

1. Set up Python environment (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

1. Install and enable pre-commit hooks (recommended)

```powershell
# from repository root
pip install pre-commit
pre-commit install
# Run the hooks across the repo once (CI will also run pre-commit)
pre-commit run --all-files
```

1. Run tests locally

```powershell
# activate backend venv (see above) then from repository root
. .\backend\.venv\Scripts\Activate.ps1
pytest -q
```

## Notes

- CI is configured to run `pre-commit` early in the backend job and will fail if hooks find issues.
- If your editor applies different line endings, run the pre-commit hooks and commit again to normalize line endings.
- For macOS/Linux, replace the Windows activate commands with `source backend/.venv/bin/activate`.

If you'd like, I can also add a small PowerShell script under `scripts/` to automate the above steps for Windows developers.
