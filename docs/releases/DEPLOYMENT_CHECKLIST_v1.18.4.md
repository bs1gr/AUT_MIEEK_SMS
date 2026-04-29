# Deployment Checklist vv1.18.21

## Pre-Tag Checks

- [x] Working tree contains only intentional release changes.
- [x] `VERSION` and `frontend/package.json` both set to `1.18.4`.
- [x] `CHANGELOG.md` has finalized `1.18.4` section.
- [ ] Release docs prepared:
  - [x] `RELEASE_NOTES_vv1.18.21.md`
  - [x] `GITHUB_RELEASE_vv1.18.21.md`
  - [x] `RELEASE_MANIFEST_vv1.18.21.md`
  - [x] `.github/RELEASE_NOTES_vv1.18.21.md`

## Tag & Release Execution

- [x] Create and push tag `vv1.18.21` from `main`.
- [x] Confirm `release-on-tag.yml` started.
- [x] Confirm release body was created/updated from `.github/RELEASE_NOTES_vv1.18.21.md`.
- [x] Confirm installer workflow dispatch to `release-installer-with-sha.yml`.

## Workflow Gate Verification

- [x] Signature gate passed.
- [x] Payload minimum size gate passed.
- [x] Installer digest gate passed.
- [x] SHA256 sidecar uploaded successfully.
- [x] Sanitizer removed non-allowlisted assets (if any).
- [x] Final allowlist gate passed.

## Asset Verification

- [x] `SMS_Installer_1.18.4.exe` present.
- [x] `SMS_Installer_1.18.4.exe.sha256` present.
- [x] Local installer hash equals published `.sha256` value.

## Post-Release Operational Verification

- [ ] Native smoke verification (`NATIVE.ps1 -Start`) for app startup sanity.
- [ ] Docker production verification (`DOCKER.ps1 -Start`) for deployment sanity.
- [x] Backup/restore control operations require admin bearer auth.
- [x] Release record updated in `docs/plans/UNIFIED_WORK_PLAN.md`.

## Rollback Preparedness

- [x] Previous installer release remains accessible.
- [x] Prior stable tag recorded (`vv1.18.21`).
- [x] No legacy-tag workflow re-dispatch actions performed.

## Workflow Evidence (vv1.18.21)

- `Create GitHub Release on tag` run `22315391846` — success
- `Release - Build & Upload Installer with SHA256` run `22315419856` — success
- `Release Asset Sanitizer` run `22315551253` — success
- Release URL: `https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vv1.18.21`
- Hash verification: `sha_match=true` (downloaded installer hash matches `.sha256` sidecar)
