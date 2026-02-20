# Deployment Checklist - v1.18.2

**Version:** 1.18.2
**Date:** February 20, 2026
**Type:** Patch release (installer runtime hotfix)
**Risk:** Low to medium (installer path correction + release-lineage hardening)

## 1) Pre-Deploy Validation

- [ ] Verify tag and release exist: `v1.18.2`
- [ ] Confirm release is published (non-draft)
- [ ] Confirm asset allowlist only contains:
  - `SMS_Installer_1.18.2.exe`
  - `SMS_Installer_1.18.2.exe.sha256`
- [ ] Confirm installer SHA256:
  - `1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`

## 2) Environment Workflow Policy

- [ ] Native testing workflow uses `NATIVE.ps1`
- [ ] Production deployment workflow uses `DOCKER.ps1`
- [ ] No ad-hoc deployment path used

## 3) Smoke Validation (Post-Deploy)

- [ ] Application starts cleanly
- [ ] Login and dashboard accessible
- [ ] Installer path no longer reproduces runtime crash scenario
- [ ] Backend health endpoint responds

## 4) Documentation & Tracking

- [ ] Release notes present: `docs/releases/RELEASE_NOTES_v1.18.2.md`
- [ ] GitHub release body present: `docs/releases/GITHUB_RELEASE_v1.18.2.md`
- [ ] Manifest present: `docs/releases/RELEASE_MANIFEST_v1.18.2.md`
- [ ] Work plan updated for v1.18.2 release status
- [ ] Documentation index updated for v1.18.2

## 5) Rollback Readiness

- [ ] Previous release reference retained (`v1.18.1`)
- [ ] Recovery path documented for installer redeploy if needed

---

**Release URL:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.2
