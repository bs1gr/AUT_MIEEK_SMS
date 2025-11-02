# Archived documents index

Date: 2025-11-02

This folder contains conservative archives of documentation moved from the repository root to reduce clutter. Each file is preserved unchanged (except for small whitespace/line-ending fixes) and retained for historical reference.

Archived files

- `ARCHITECTURE_IMPROVEMENTS_v1.3.1.md` — Older architecture notes; moved to archive because `docs/ARCHITECTURE.md` is the active source.
- `CLI_TESTING_AND_IMPROVEMENTS_SUMMARY.md` — CLI testing notes consolidated in docs; archived for history.
- `CLI_TESTING_FINAL_SUMMARY.md` — Final CLI testing findings (archived).
- `IMPLEMENTATION_SUMMARY.md` — Implementation walkthrough (archived; refer to `docs/DEVELOPMENT.md` for current guidance).
- `IMPROVEMENTS_SUMMARY_FINAL.md` — Final summary of code-quality improvements (archived pointer exists at repository root).
- `IMPROVEMENTS_SUMMARY_v1.3.1.md` — Prior improvements snapshot (archived).
- `IMPROVEMENTS_v1.3.3.md` — Release notes / improvements (archived).
- `v1.3.5-release-draft.md` — Release draft for tag `v1.3.5` (copied from `.github/release-drafts/` for convenience).

Notes

- Originals were replaced with short pointer files at the original locations to guide readers to this archive.
- No files were permanently deleted; everything is preserved under `docs/archive/` and in Git history.

How to restore an archived file

If you want any archived file restored to its original location, run:

```powershell
git checkout HEAD -- docs/archive/IMPROVEMENTS_SUMMARY_FINAL.md
git restore --source=HEAD --staged --worktree IMPROVEMENTS_SUMMARY_FINAL.md
```

Or open a PR suggesting the restore and I can apply it for you.
