---
title: "Harden DEV_EASE: restrict to pre-commit + add pre-commit hook installer"
reviewers: []
labels: [ci, docs, maintenance]
---

Summary
-------

This change tightens the DEV_EASE developer convenience feature so it can only be used
as an opt-in for the local pre-commit tool `COMMIT_READY.ps1`. DEV_EASE no longer alters
runtime application behavior and cannot be enabled from CI or startup scripts.

Why
---

DEV_EASE originally made it convenient for local development by relaxing auth/CSRF/secret
validation; however it introduced a risk surface if used in CI or unintentionally in
running services. The project policy is to keep all runtime behaviour strict by default.

What I changed (high level)
---------------------------

- COMMIT_READY.ps1 — added an explicit check requiring `DEV_EASE` to be set for local

  invocations that use SkipTests, SkipCleanup, or AutoFix. This prevents accidental skips
  unless explicitly opted into by the developer.
- Removed runtime/CI usage of DEV_EASE and related opt-in (ALLOW_CI_DEV_EASE). CI workflows

  will no longer attempt to enable DEV_EASE.
- Removed the permissive dev-run CI workflow that started backend with DEV_EASE.
- Backend config: removed DEV_EASE runtime handling; documented that DEV_EASE is pre-commit-only.
- NATIVE.ps1: marked DEV_EASE as deprecated in help text and ensured it is not injected into child processes.
- Added an easy-to-install pre-commit hook sample `.githooks/commit-ready-precommit.sample` and

  cross-platform installer scripts under `scripts/` (`install-git-hooks.ps1` and `install-git-hooks.sh`).
- Updated docs across the repo to reflect the new policy and show how to enable the pre-commit hook.

Files touched (representative)
----------------------------

- `COMMIT_READY.ps1` — enforcement added
- `backend/config.py` — DEV_EASE not used at runtime (comment + validators)
- `backend/.env.example`, `backend/ENV_VARS.md`, `backend/README.md` — document DEV_EASE policy
- `.githooks/commit-ready-precommit.sample` — sample hook added
- `scripts/install-git-hooks.ps1`, `scripts/install-git-hooks.sh` — hook installers
- Docs updated: README.md, scripts/README.md, docs/development/*, CONTRIBUTING.md, VALIDATION_STATUS.md, REPOSITORY_AUDIT_SUMMARY.md
- `.github/workflows/dev-local-run.yml` — retired/removed (no longer enabling DEV_EASE in CI)

Verification performed
----------------------

- Run full test suite: 1011 passed, 0 failed (local run)
- Repo-wide search confirms DEV_EASE is referenced only in COMMIT_READY (pre-commit), docs and the hook sample
- Docs were updated to include explicit instructions for the pre-commit hook installer and the DEV_EASE policy

Recommended reviewer checklist
-----------------------------

- [ ] Confirm COMMIT_READY.ps1 behavior is correct and enforces DEV_EASE for local skip flags
- [ ] Confirm there are no runtime or CI paths that enable DEV_EASE
- [ ] Scan docs & examples for ambiguous guidance about DEV_EASE and pre-commit hooks
- [ ] Run local validation and optionally install the provided hook (scripts/install-git-hooks.*)

Backwards compatibility & migration
---------------------------------

Existing developers who previously enabled DEV_EASE at runtime should remove the setting
from local `.env` or avoid setting it in CI. The pre-commit helper and installer make it
easy to opt-in only for pre-commit tasks.

Notes
-----

This PR is intentionally conservative: it keeps developer ergonomics (pre-commit convenience)
while preventing accidental weakening of runtime or CI security. It also adds a small quality-of-life
installer to encourage contributing developers to enable the canonical checks automatically.

