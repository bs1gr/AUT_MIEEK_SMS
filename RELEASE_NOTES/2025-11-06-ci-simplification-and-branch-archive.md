# CI Simplification and Branch Archiving (2025-11-06)

This note documents the CI pipeline simplification and repository hygiene work completed on 2025-11-06.

## What changed

- Consolidated CI to the essentials:
  - Backend: ruff, mypy, pytest (with coverage), pip-audit, SBOM generation, wheelhouse caching
  - Frontend: Node 20 build
- Removed report-only/validator jobs that normalized and validated ruff output (reduced noise and maintenance).
- Deleted obsolete CI scripts and tests:
  - .github/scripts/normalize_ruff.py
  - .github/scripts/validate_ruff_report.py
  - .github/tests/test_validate_ruff_report.py
  - backend/tests/test_validate_ruff_report.py
- Archived and deleted a long-lived, risky branch:
  - Deleted: origin/ci/remove-vendor-actions
  - Archive tag created: archive/ci-remove-vendor-actions-20251106 (preserves branch tip)

## Why

- Reduce CI complexity and runtime; keep only actionable checks that block on failures.
- Remove unused scripts/tests to avoid confusion and accidental drift.
- Keep the branch list clean and safe by archiving large, experimental work that is not intended to merge.

## Validation

- Backend tests pass locally after the cleanup (pytest). No code changes were made—only CI and docs/scripts cleanup.
- Tag confirmed on remote; branch removed from origin.

## Impact

- No functional changes to the application.
- No database migrations.
- CI remains strict on lint/type tests and security scanning, but without auxiliary report-processing jobs.

## Follow-ups

- If desired, add a short blurb to release notes when cutting the next version (>= 1.3.9) to reference this cleanup.
