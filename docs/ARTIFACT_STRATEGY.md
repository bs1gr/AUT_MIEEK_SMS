# Release artifact handling

This repository can produce large release artifacts (zips, bundles) that are unsuitable for tracking directly in Git history. Below are recommended, non-destructive policies.

## 1) Prefer GitHub Releases

- Build artifacts (dist/*.zip) should be attached to GitHub Releases.
- Do not commit built artifacts to the repository; add them to `.gitignore` (already done for `dist/`).

## 2) Use Git LFS for large generated files (optional)

- If you need to store large artifacts in the git tree, use Git LFS to avoid bloating the repository.
- Quick steps:

  1. git lfs install
  2. git lfs track "dist/**"
  3. git add .gitattributes
  4. git commit -m "chore: enable git lfs for release artifacts"
  5. git add dist/ARTIFACT.zip
  6. git commit -m "chore: add release artifact via LFS"
  7. git push

## 3) If a file was accidentally committed to history

- Prefer a conservative approach: delete the file in a new commit and remove it from the index, then push.
- If you must permanently remove the blob from history, coordinate a maintenance window and run a history rewrite (git-filter-repo or BFG). This is destructive and requires all collaborators to clone again.

## 4) Guidelines for CI and releases

- CI should create artifacts in a build step and upload them to the GitHub release using the Actions `upload-release-asset` action.
- Avoid committing artifacts in PRs; add a CI step to publish artifacts and attach them to the matching tag/release.

If you want, I can:

- Add a small GitHub Actions workflow that builds and uploads a release asset when a tag is pushed.
- Prepare a short PR that enables Git LFS (.gitattributes already contains guidance) and demonstrates tracking `dist/**`.
