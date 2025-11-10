# PR: Harden Control API (shutdown endpoints)

Summary
-------
This PR hardens the control/shutdown endpoints and documents their operational usage.

Files changed (high level)
- backend/control_auth.py  — New: FastAPI dependency `require_control_admin`, `create_control_dependency`
- backend/main.py          — Wired control dependency, applied rate-limiter decorators, added token masking in audit logs, minor typing cast to satisfy static checkers
- backend/CONTROL_API.md   — Operational documentation and examples
- backend/tests/conftest.py — Tests now explicitly opt-in to control API (ENABLE_CONTROL_API=1)
- backend/scripts/test_control_bearer.py — Temporary script used to validate bearer/token flows (can be removed before merge)

Validation performed
-------------------
- Ran full backend test suite: `cd backend && pytest -q` — exit code 0
- Ran targeted control endpoint test: `pytest tests/test_control_endpoints.py::test_control_stop_kills_pids` — passed
- Ran bearer/token flow script `backend/scripts/test_control_bearer.py` to validate both ADMIN_SHUTDOWN_TOKEN header-flow and JWT-based login path (monkeypatched loopback); both exercised successfully.
- Ran `ruff check backend` locally to identify lints; many repo-wide lints exist unrelated to this change. I limited changes to a small type-cast in `main.py` to keep static checkers quiet for the dependency assignment.

Notes for reviewers
-------------------
- The control API remains hidden by default (ENABLE_CONTROL_API=1 required).
- For production, operators should set `ADMIN_SHUTDOWN_TOKEN` and `ALLOW_REMOTE_SHUTDOWN` as appropriate and protect the token in secret management.
- I added `backend/scripts/test_control_bearer.py` as a disposable validation script — I can remove it before opening the PR if you prefer a cleaner diff.

Suggested next steps before merging
----------------------------------
- Remove the disposable test script or move it under `tests/` as an explicit integration test.
- Address repo-wide ruff/mypy issues in separate PRs.
- (Optional) Add explicit unit tests for the `create_control_dependency` integration path (JWT-bearing admin users) to prevent regressions.

Change checklist
----------------
- [x] Code changes applied
- [x] Unit tests run (backend suite)
- [x] Targeted control tests run
- [x] Documentation added

How to create the PR locally
----------------------------
1. Create a branch:

```powershell
cd d:/SMS/student-management-system
git checkout -b feat/harden-control-api
git add -A
git commit -m "Harden control API: require_control_admin dependency, rate-limits, docs, tests"
git push -u origin feat/harden-control-api
```

2. Open a PR on GitHub from `feat/harden-control-api` into `main` and paste the PR summary from `.github/PR_SUMMARY.md`.

If you want, I can create a tidy commit message and squash/fixup the edits before you open the PR.
