# CI Logs and Local Cleanup Policy

This repository creates temporary CI/local artifact folders during workflows and developer runs (for example `tmp_artifacts/` or `tmp_artifacts_runNN/`). Those folders may contain logs such as `pytest-output.txt` and `migrations.log` that are useful for debugging but should not be committed to source control.

## Where logs are stored

- Canonical runtime/CI logs used by workflows are placed under `logs/` in the repository root (e.g. `logs/migrations.log`, `logs/pytest-output.txt`). These are committed (log rotation/size limits apply) and are uploaded by CI as artifacts in workflow runs and attached to Releases when appropriate.
- Local temporary artifacts created during developer runs or by automation are created under `tmp_artifacts*` (for example `tmp_artifacts_run31/`) and should be ignored by git. These are intended to be transient and for local inspection only.

## Cleanup policy

- Never commit temporary CI artifacts or local generated folders. Add these patterns to `.gitignore`:

  - `tmp_artifacts/`
  - `tmp_artifacts*`
  - `tmp_*`

- If a temporary artifact folder is accidentally committed, untrack it with:

```pwsh
# from repo root
git rm --cached -r <path>
git commit -m "chore: untrack accidentally committed artifact <path>"
```

- For convenience, this repository includes a conservative cleanup script at `scripts/clean_tmp_artifacts.ps1`. The script does the following:
  - Refuses to delete anything if any matching files are currently tracked by git (safe guard)
  - Appends ignore rules to `.gitignore` when missing and attempts to commit the change
  - Removes untracked local directories that match `tmp_artifacts*` and `tmp_*`

### How to run the cleanup script

Run from the repository root with PowerShell (Windows):

```pwsh
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\clean_tmp_artifacts.ps1
```

The script is intentionally conservative. If you see a message indicating "Found tracked files that match cleanup patterns", follow the instructions printed by the script to untrack them manually before running the cleanup.

## Release attachments

When the CI publishes releases it may attach diagnostic artifacts such as `logs/migrations.log` and `logs/pytest-output.txt`. These release attachments are useful for debugging failed runs and should be downloaded instead of committing diagnostic logs to the repository.

## Contacts

If you're unsure whether a file should be ignored or kept in the repository, open an issue or contact the repository maintainers.
