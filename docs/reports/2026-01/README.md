# January 2026 Reports Index

This folder collects session reports and artifacts for January 2026 to provide clear evidence of the current project state.

## Snapshot (Jan 17, 2026)

- Version: $11.18.3 (from `VERSION`)
- Branch: `main`
- Backend tests: All 17/17 batches passed; duration 132.8s; exit code 0
  - Skips: integration smoke (by design), version consistency checks for non-present optional files
  - Warning: `datetime.utcnow()` deprecation noted in `tests/test_websocket.py` (non-blocking)
- Repository hygiene:
  - `.gitignore` updated to ignore local build artifacts and datasets (`build/`, `*.egg-info/`, `backend/data/{imports,exports}/*.csv`)
  - Previously tracked CSVs and IDE profile removed from index (kept locally)
  - Session reports relocated under `docs/reports/2026-01/` for discoverability

## Contents

- `COMPREHENSIVE_TEST_REPORT_JAN17.md` — Full backend batch test output and summary (evidence of 17/17 batches passing)
- `TEST_FIX_SUMMARY_JAN17.md` — Notes on fixes applied and verification steps during Jan 17 session
- `WORKSPACE_RECOVERY_GUIDE.md` — Guidance and steps used for recovering workspace state

## How to verify quickly

- Run backend tests using the batch runner (policy-compliant):
  - `RUN_TESTS_BATCH.ps1` from repository root
- Check results in `test-results/backend_batch_full.txt` (if produced) or session report above
- Ensure no large artifacts are tracked:
  - `git status` should not list `build/`, `*.egg-info/`, or `backend/data/exports/*.csv`

## Notes

- Frontend and E2E tests can be run via tasks in the VS Code workspace (see `Run frontend tests (vitest)` and `RUN_E2E_TESTS.ps1`).
- For production deployment checks, use `DOCKER.ps1 -Start` (testing and development use `NATIVE.ps1 -Start`).
