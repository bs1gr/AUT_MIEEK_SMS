# Deployment Checklist - v1.18.3

**Version:** 1.18.3
**Date:** February 20, 2026
**Type:** Patch release (RBAC imports fallback scope fix + installer refresh)
**Risk:** Low to medium (authorization edge-case tightening + installer artifact refresh)

## 1) Pre-Deploy Validation

- [ ] Verify tag and release exist: `v1.18.3`
- [ ] Confirm release is published (non-draft)
- [ ] Confirm asset allowlist only contains:
  - `SMS_Installer_1.18.3.exe`
  - `SMS_Installer_1.18.3.exe.sha256`
- [ ] Confirm installer SHA256:
  - `c6f8eb7e0c84faa97ae049de3c81d2c967ca54880f6c7b52afa7fa3ec88c382c`

## 2) Environment Workflow Policy

- [ ] Native testing workflow uses `NATIVE.ps1`
- [ ] Production deployment workflow uses `DOCKER.ps1`
- [ ] No ad-hoc deployment path used

## 3) Smoke Validation (Post-Deploy)

- [ ] Application starts cleanly
- [ ] Login and dashboard accessible
- [ ] Import workflows validate correctly under RBAC
- [ ] Backend health endpoint responds

## 4) Documentation & Tracking

- [ ] Release notes present: `docs/releases/RELEASE_NOTES_v1.18.3.md`
- [ ] GitHub release body present: `docs/releases/GITHUB_RELEASE_v1.18.3.md`
- [ ] Manifest present: `docs/releases/RELEASE_MANIFEST_v1.18.3.md`
- [ ] Work plan updated for v1.18.3 status
- [ ] Documentation index updated for v1.18.3

## 5) Rollback Readiness

- [ ] Previous release reference retained (`v1.18.2`)
- [ ] Recovery path documented for installer redeploy if needed

---

**Planned Release URL:** https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.3
