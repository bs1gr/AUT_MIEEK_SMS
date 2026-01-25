Hardening: remove casual taskkill docs & add operator guidance — follow-up
=====================================================================

This file is an automated summary prepared for PR #25 (branch: hardening/remove-taskkill-docs).

Changes applied in this follow-up:

- Added a repo-local venv wrapper to make pre-commit hooks reproducible across OSes:
  - `scripts/run_in_venv.py` (cross-platform Python script)
  - Pre-commit now runs the import checker via the venv wrapper.

- Exported the import->distribution mapping used by the checker to JSON:
  - `tools/import_name_mapping.json` (used by `tools/check_imports_requirements.py`)

- Integrated the import-vs-requirements checker into the existing `CI` job so it runs in

  the same environment that installs project dependencies. See `.github/workflows/ci.yml`.

Verification performed locally (on Windows, pwsh):

- ruff: PASS
- mypy: PASS (no new type errors in `backend`)
- tools/check_imports_requirements.py: PASS (reports OK)
- pytest (with `DISABLE_STARTUP_TASKS=1`): PASS (exit code 0)

Notes & next steps:

- The venv wrapper does not auto-install project dependencies (to avoid heavy installs

  for simple checks). If you want the wrapper to install `backend/requirements.txt` the
  script can be extended to do so behind a `--install-deps` flag.
- I created this PR update file so reviewers and CI bots can see the verification results.

  If you'd like, I can also attempt to edit the PR body directly via the GitHub API/CLI
  (requires a configured token on my behalf); tell me and I'll try.

Files changed in this follow-up (new/modified):

- scripts/run_in_venv.py — create/run repo-local venv
- tools/import_name_mapping.json — mapping of imports -> PyPI distribution names
- tools/check_imports_requirements.py — now loads mapping JSON
- .pre-commit-config.yaml — runs checker through venv wrapper
- .github/workflows/ci.yml — runs the checker as part of backend job
