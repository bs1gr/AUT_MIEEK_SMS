# CI Failure Monitor — Setup Guide

This monitor workflow creates an issue automatically when a workflow run completes with a failure. Because workflows triggered by `workflow_run` events run with a `GITHUB_TOKEN` that may have limited permissions in some contexts, the monitor supports using a Personal Access Token (PAT) stored in a repository secret `CI_MONITOR_TOKEN`.

1) Create a Personal Access Token (PAT)

- Open GitHub settings → Developer settings → Personal access tokens → "Generate new token".
- Generate a new token with the following minimum scope:
  - `repo:issues` (or full `repo` if you prefer)
- Set an expiration (recommended) and copy the token value.

2) Add repository secret

- In the repository: Settings → Secrets and variables → Actions → New repository secret
- Name: `CI_MONITOR_TOKEN`
- Value: the PAT you created above

3) Re-enable the monitor

- The repository already contains the hardened monitor workflow at `.github/workflows/ci-failure-monitor.yml`.
- When `CI_MONITOR_TOKEN` is present, the workflow will use it to open issues via the REST API. If the secret is not present the monitor will log and skip creating issues.

4) Rotating the token

- Treat the PAT like any other secret. Rotate it regularly (recommended every 30-90 days).
- When you rotate the PAT, update the `CI_MONITOR_TOKEN` secret with the new value.

Security notes

- Prefer granting the least privilege (`repo:issues`) rather than full `repo` unless necessary.
- Use a PAT with an expiration and rotate frequently.

Notes and recommendations

- Use a PAT attached to a machine/service account rather than a personal user if possible.
- Ensure the PAT includes the `issues:write` (or full `repo` scope for private repos) so the monitor can create issues. If you plan to have the monitor dispatch workflows, also include the `workflow` scope.
- Rotate the PAT periodically and record the rotation date in your operations runbook.
- Store the PAT in the repository secret `CI_MONITOR_TOKEN` (Repository → Settings → Secrets → Actions) and verify by running the manual monitor test workflow (`.github/workflows/ci-failure-monitor-manual-test.yml`).

If you don't want an always-on PAT, the monitor will still perform read-only checks; issue creation will be skipped when the PAT is missing or lacks permissions. The monitor workflow contains runtime guards to make this safe.

If you'd like, I can add a short README note in the repo root linking to this doc and then re-enable the monitor trigger (I will push the changes and re-run CI). If you'd like to supply the PAT secret now, add it in the repo settings and I will verify the monitor run creates issues as expected.
