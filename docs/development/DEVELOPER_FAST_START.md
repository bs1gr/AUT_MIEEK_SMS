# Developer Fast Start (Archived - Use DEVELOPER_GUIDE_COMPLETE.md)

> **📖 For Complete Guide:** See **[DEVELOPER_GUIDE_COMPLETE.md](DEVELOPER_GUIDE_COMPLETE.md)** for comprehensive setup, testing, and troubleshooting.
>
> **Quick Start Only**: This document is kept for historical reference. All setup information is consolidated in the complete guide.

## Quick Setup Steps

1. Set up Python environment (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

```text
1. Install and enable pre-commit hooks (recommended)

```powershell
# from repository root

pip install pre-commit
pre-commit install
# Run the hooks across the repo once (CI will also run pre-commit)

pre-commit run --all-files

Optional: install the repository-provided pre-commit sample hook which runs
`COMMIT_READY.ps1 -Mode quick` before commits. This is useful if you want a
consolidated full-check at commit time (lint + tests + i18n checks).

Install the sample hook using the included installer scripts:

PowerShell (Windows)

```powershell
pwsh ./scripts/install-git-hooks.ps1

```text
POSIX (macOS / Linux)

```bash
./scripts/install-git-hooks.sh

```text
```text
1. Run tests locally

```powershell
# activate backend venv (see above) then from repository root

. .\backend\.venv\Scripts\Activate.ps1
pytest -q

```text
## Notes

- CI is configured to run `pre-commit` early in the backend job and will fail if hooks find issues.
- If your editor applies different line endings, run the pre-commit hooks and commit again to normalize line endings.
- For macOS/Linux, replace the Windows activate commands with `source backend/.venv/bin/activate`.

If you'd like, I can also add a small PowerShell script under `scripts/` to automate the above steps for Windows developers.
