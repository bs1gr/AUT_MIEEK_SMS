# Release v1.3.5 — Import-resolver sweep & CI enforcement

Draft announcement

Summary
-------
We released v1.3.5. Main highlights:

- Centralized import fallback logic (`backend/import_resolver.py`) and swept backend modules to use it.
- Enforced static checks in CI (mypy as a blocking check, ruff checks).
- Secret-guard policy: CI blocks on `main` if `SECRET_KEY` is missing/placeholder.
- Quieter DB health-check logging during tests (`TESTING=true`).
- Added a CI job to run pre-commit on pushes/PRs to `main`.

What I did for you
------------------
- Published tag `v1.3.5` and created a GitHub release.
- Added CI workflow to build Docker images on tag push (will push only if `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are configured).
- Added a workflow to automatically create a GitHub release when a tag is pushed (uses `.github/RELEASE_NOTES_<tag>.md` when present).

Checklist for final publish
---------------------------
- [ ] Add Docker registry credentials to repository secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD` (for docker.io) or update workflow to push to your preferred registry.
- [ ] Verify images built by Actions (after pushing secrets) and optionally tag/shade images for other registries.
- [ ] Announce to team: copy this file into Slack/email with the release link: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.5

Suggested short announcement
----------------------------
We just published v1.3.5 — CI and import cleanup.

Highlights:
- Improved import handling and CI enforcement (mypy + ruff).
- Release includes minor backend adjustments to reduce test log noise.

See full notes and assets in the GitHub release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.5
