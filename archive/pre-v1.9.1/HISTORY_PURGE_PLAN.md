# HISTORY PURGE PLAN (DRAFT)

## Purpose

 This document describes a non-destructive, reversible plan to purge large or sensitive files from repository history using `git-filter-repo` or `BFG`. It is intentionally a plan only — this repository maintainer must explicitly approve any destructive history rewrite and coordinate with collaborators.

## When to use

- If repository size must be reduced because large binary files (e.g., `bfg.jar`, `repo-mirror.git/*`, `backend/student_management.db`) are inflating the repo.
- If sensitive secrets were committed and must be removed from history.

## High-level steps (safe preparatory steps first)

 1. Identify candidate paths to remove. Example candidates (already untracked):
    - `backend/student_management.db`
    - `setup.log`
    - `bfg.jar`
    - `repo-mirror.git` and related report files
 2. Create a safety snapshot:
    - `git bundle create repo-backup.bundle --all`
    - Store the bundle in a secure location (do not push to origin)
 3. Share plan with collaborators and pick a maintenance window. History rewrite will require force-pushing and can disrupt forks.

## Using `git-filter-repo` (recommended)

 1. Install: `pip3 install git-filter-repo` or use distro package.
 2. Run locally on a fresh clone (do NOT run in current working tree):

    ```pwsh
    git clone --mirror https://github.com/bs1gr/AUT_MIEEK_SMS.git repo-mirror.git
    cd repo-mirror.git
    git-filter-repo --invert-paths --paths backend/student_management.db --paths bfg.jar --paths repo-mirror.git
    # Verify history, run tests against tip
    git push --force --mirror origin
    ```

 3. Inform collaborators to re-clone or run `git fetch --all && git reset --hard origin/main`.

## Using BFG (alternative)

 1. Download BFG jar; recommended only for simple-scope removals.
 2. Create mirror clone and run BFG with `--delete-files` or `--replace-text` as needed.
 3. Force-push mirror and coordinate with collaborators.

## Roll-back plan

- Keep `repo-backup.bundle` for safe recovery.
- If something goes wrong, revert by restoring the bundle to a new remote and informing collaborators.

## Checklist before approval

- [ ] Confirm exact list of paths to remove
- [ ] Create and secure bundle backup
- [ ] Coordinate a maintenance window and communicate with team
- [ ] Approve the destructive action in writing (PR comment or issue)

## Notes

- This operation is destructive for repository history and cannot be partially undone once pushed and used by others.
- If secrets are involved, rotating credentials is also required (change tokens, invalidate leaked keys).

## Status

- No destructive history rewrite was performed as part of the v1.3.7 maintenance changes. The repository was cleaned non-destructively (untracked large files, updated `.gitignore`, added cleanup helpers). This document remains a plan-only reference until an explicit approval is provided by the repository owner and collaborators.

## Next steps if you approve a purge

- Confirm the exact paths to remove and create the `repo-backup.bundle` as described above.
- Follow the `git-filter-repo` procedure under a coordinated maintenance window and instruct all contributors to re-clone after the purge.
