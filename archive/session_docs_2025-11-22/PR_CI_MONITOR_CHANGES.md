 # CI Failure Monitor + Auth Improvements — Short PR / Release note

 ## Summary

 This change set hardens the CI failure monitoring and implements server-side refresh token support in the backend.

 ## Key points

 - CI monitor now only acts on completed workflow runs with conclusion=failure.
 - The monitor uploads diagnostic artifacts containing the GitHub API issue-creation response and an HTTP-status meta file for durable debugging.
 - A reconciliation workflow (hourly/manual) was added to find recently failed runs that were missed and create issues for them.
 - The reconciliation job now uploads an audit artifact (`ci_reconcile_audit`) listing inspected runs and any issues created.
 - Backend: added server-persisted refresh tokens with rotation/revocation and corresponding tests + Alembic migrations.

 ## Why

 In earlier runs some monitor events and API responses were ephemeral or missing from job logs; persisting API responses and adding a reconciliation audit makes root-cause investigation and recovery reliable.

 ## Notes for reviewers

 - Check `.github/workflows/ci-failure-monitor.yml` and `.github/workflows/ci-failure-monitor-reconcile.yml` for the artifact upload steps and safe guards.
 - Review `backend/routers/routers_auth.py`, `backend/models.py`, `backend/schemas/auth.py` and `backend/migrations/versions/*` for the auth implementation and migrations.
 - Tests were run locally; see `docs/CI_MONITORING_CHANGES_SUMMARY.md` for verification details and next steps.

 ## Operational action

 - To enable automatic issue creation via a PAT, set a repository secret named `CI_MONITOR_TOKEN` with appropriate scopes (issues write / repo). Without it the monitor will skip creating issues and the reconcile job writes an audit artifact noting the skip.

 Commit: 53e7097 (and follow-up commits)
