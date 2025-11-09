# Removed/Consolidated Documentation Summary

Date: 2025-11-04

This file lists repository-level Markdown documents that were judged obsolete or duplicated
and removed as part of a workspace cleanup. The goal was to consolidate canonical
documentation under `docs/` and `rewrite-preview-local/` while removing noisy or
duplicate top-level files.

Removed items (top-level)

- SCRIPT_REORGANIZATION_SUMMARY.md
- REORGANIZATION_COMPLETE.md
- IMPROVEMENTS_v1.3.3.md
- IMPROVEMENTS_SUMMARY_v1.3.1.md
- IMPROVEMENTS_SUMMARY_FINAL.md
- IMPLEMENTATION_SUMMARY.md
- GIT_COMMIT_READY.md
- FRESH_CLONE_TEST_REPORT_V1.2.md
- FRESH_CLONE_TEST_REPORT.md
- CLI_TESTING_AND_IMPROVEMENTS_SUMMARY.md
- CLI_TESTING_FINAL_SUMMARY.md
- CODE_REVIEW_AND_IMPROVEMENTS.md
- COMMIT_INSTRUCTIONS.md
- CRITICAL_FIXES_APPLIED.md
- ARCHITECTURE_IMPROVEMENTS_v1.3.1.md

Notes

- These files were removed from the repository root because up-to-date versions
  or canonical copies exist under `docs/`, `docs/archive/`, or `rewrite-preview-local/`.
- Core files that were kept in-place include `README.md`, `INSTALL.md`, `CHANGELOG.md`,
  and `RELEASE_NOTES_v1.3.7.md` (now consolidated). See [CHANGELOG.md](../CHANGELOG.md) for the canonical history.
- If you need any removed file restored, it can be recovered from the repository
  history (git) or from archived copies in `docs/archive/` or `rewrite-preview-local/`.

Rationale

- Reduce noise in the repository root, improve discoverability of canonical docs,
  and remove duplicated/outdated reports that were created during development and
  reorganization efforts.

Next steps

- Review `docs/` for canonical documentation and update `README.md` links if needed.
- Optionally run `git gc` or similar maintenance on large archives (mirrors) if desired.

Signed-off-by: Automated cleanup (agent)
