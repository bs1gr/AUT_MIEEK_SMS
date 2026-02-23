# Deployment Checklist v1.18.4

## Pre-Tag Checks

- [ ] Working tree contains only intentional release changes.
- [ ] `VERSION` and `frontend/package.json` both set to `1.18.4`.
- [ ] `CHANGELOG.md` has finalized `1.18.4` section.
- [ ] Release docs prepared:
  - [ ] `RELEASE_NOTES_v1.18.4.md`
  - [ ] `GITHUB_RELEASE_v1.18.4.md`
  - [ ] `RELEASE_MANIFEST_v1.18.4.md`
  - [ ] `.github/RELEASE_NOTES_v1.18.4.md`

## Tag & Release Execution

- [ ] Create and push tag `v1.18.4` from `main`.
- [ ] Confirm `release-on-tag.yml` started.
- [ ] Confirm release body was created/updated from `.github/RELEASE_NOTES_v1.18.4.md`.
- [ ] Confirm installer workflow dispatch to `release-installer-with-sha.yml`.

## Workflow Gate Verification

- [ ] Signature gate passed.
- [ ] Payload minimum size gate passed.
- [ ] Installer digest gate passed.
- [ ] SHA256 sidecar uploaded successfully.
- [ ] Sanitizer removed non-allowlisted assets (if any).
- [ ] Final allowlist gate passed.

## Asset Verification

- [ ] `SMS_Installer_1.18.4.exe` present.
- [ ] `SMS_Installer_1.18.4.exe.sha256` present.
- [ ] Local installer hash equals published `.sha256` value.

## Post-Release Operational Verification

- [ ] Native smoke verification (`NATIVE.ps1 -Start`) for app startup sanity.
- [ ] Docker production verification (`DOCKER.ps1 -Start`) for deployment sanity.
- [ ] Backup/restore control operations require admin bearer auth.
- [ ] Release record updated in `docs/plans/UNIFIED_WORK_PLAN.md`.

## Rollback Preparedness

- [ ] Previous installer release remains accessible.
- [ ] Prior stable tag recorded (`v1.18.3`).
- [ ] No legacy-tag workflow re-dispatch actions performed.
