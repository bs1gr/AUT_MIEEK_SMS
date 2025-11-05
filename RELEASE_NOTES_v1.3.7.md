# Release v1.3.7

## Date

2025-11-03

## Summary

This release publishes the maintenance work that was staged under "Unreleased" in the CHANGELOG.

## Highlights

- Import-resolver sweep & CI enforcement (developer-maintenance)

## Details

This release contains developer-facing maintenance and CI hardening:

- Centralized import fallback logic and replaced ad-hoc import try/except patterns across backend modules.
- Improvements to CI workflows to make static checks (mypy, ruff) reliable and safer for fork/PR runs.
- Secret-guard and migration CI jobs hardened with safe fallbacks for CI environments.
- Pre-commit, linter and typing fixes applied to backend to make CI pass reliably.

## Notes

- No API or database schema changes are included in this release; this is a maintenance release focused on developer tooling and CI reliability.
- For more details see CHANGELOG.md and the commit history.
