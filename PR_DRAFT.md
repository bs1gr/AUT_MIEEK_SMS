Title: Harden startup & control endpoints for CI safety; add CI and docs

Description
-----------
This PR hardens the backend for safer CI, local development, and production deployments. It addresses a test-suite hang caused by startup side-effects and reduces the risk of accidental host process termination from control endpoints.

Changes
-------
- backend/main.py
  - Added `DISABLE_STARTUP_TASKS` guard to skip migrations, schema checks, and background auto-import when set. This prevents TestClient imports and CI runs from triggering long-running or network operations.
  - Added `_allow_taskkill()` and `_safe_run()` wrappers to gate destructive OS-level commands (e.g., `taskkill`). Default is disabled; set `CONTROL_API_ALLOW_TASKKILL=1` to opt-in.
  - Replaced direct `subprocess.run([... 'taskkill' ...])` calls in control handlers with `_safe_run()`.

- backend/tests/conftest.py
  - (Updated previously) Tests set `DISABLE_STARTUP_TASKS=1` to avoid startup side-effects when running TestClient.

- .github/workflows/ci.yml
  - Ensure backend tests run with `DISABLE_STARTUP_TASKS=1` and added a manual `integration` workflow to run the full backend and smoke-test `/health`.

- backend/ENV_VARS.md
  - New documentation describing runtime environment variables and recommended usage.

- DEPLOYMENT_CHECKLIST.md
  - New deployment checklist with verification steps and recommended production configuration.

- scripts/maintenance/stop_frontend_safe.ps1
  - Operator helper to call the control API to stop the frontend instead of running `taskkill` locally.

- backups/
  - Archived `pip-audit-report.json` to reduce noise in tracked files.

Verification
------------
- Ran `ruff check .` — all checks passed.
- Ran `mypy backend` — no blocking issues.
- Ran `pytest` — 15 passed, 0 failed.

Notes & follow-ups
------------------
- Consider removing `taskkill` usage from HTTP handlers entirely and using operator tooling for process lifecycle management.
- Consider adding integration pytest tests that run against the integration workflow environment.

How to prepare the PR
---------------------
1. Create a branch from `main`, e.g. `hardening/ci-safety`.
2. Commit changes and push the branch.
3. Open a PR with this description and request review from the backend owners.

Notes for reviewers / operators:

- This change intentionally removes the server-side ability to run `taskkill` directly from the HTTP control API. Host-level destructive operations are now delegated to documented operator scripts (see `scripts/maintenance/stop_frontend_safe.ps1`) and to deployment tooling. If required in a controlled environment set `CONTROL_API_ALLOW_TASKKILL=1` (not recommended for CI).

Local validation commands (PowerShell)
```pwsh
# Run unit tests (skip heavy startup tasks)
$env:DISABLE_STARTUP_TASKS = "1"
pytest -q

# Run guarded integration smoke test locally (requires a backend or RUN_INTEGRATION):
$env:RUN_INTEGRATION = "1"
pytest backend/tests/test_integration_smoke.py -q
```
