# Release Note — 2025-11-04

Title: Safer frontend start/stop for control API
PR: <https://github.com/bs1gr/AUT_MIEEK_SMS/pull/6>
Merge commit: 12e1b707087ccf447cd37c912a2caa4f05b5c285

Summary:

- Replaced unsafe shell-based subprocess calls in `backend/main.py` control endpoints with list-style invocations (shell=False).
- Normalized user-facing `/control` API messages to be platform-agnostic.
- Added Windows `creationflags` and POSIX `close_fds` handling when starting frontend processes.
- Guarded middleware registration to avoid startup failures in edge cases.
- Added unit tests for `/control/api/start` branches (install failure, process terminated, success).
- Fixed a small lint issue flagged by ruff.

Notes:

- Local validation: ruff, mypy, and backend pytest passed locally.
- CI: PR run completed and merged.

Suggested follow-ups:

- Consider adding CI caching for npm modules if native frontend installs become slow in CI.
- Consider tightening branch merge rules so bot merges only after all required checks pass.
