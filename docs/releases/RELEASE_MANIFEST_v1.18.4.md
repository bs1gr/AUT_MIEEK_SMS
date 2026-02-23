# Release Manifest v1.18.4

**Release Tag:** `v1.18.4`  
**Branch:** `main`  
**Prepared On:** 2026-02-23

## Scope Baseline

- Diff baseline: `v1.18.3..HEAD`
- Primary themes:
  - Backup integrity fixes
  - Control API authorization hardening
  - RBAC test/reliability fixes
  - Release workflow safety and asset governance

## Expected Release Assets

1. `SMS_Installer_1.18.4.exe`
2. `SMS_Installer_1.18.4.exe.sha256`

No other release assets are permitted.

## Workflow Chain

1. `.github/workflows/release-on-tag.yml`
2. `.github/workflows/release-installer-with-sha.yml`
3. `.github/workflows/release-asset-sanitizer.yml`

## Required Gates

- Tag format gate: `v1.x.x`
- Default-branch ancestry gate
- Current-lineage dispatch gate for manual runs
- Installer signature gate (thumbprint check)
- Payload minimum size guardrail
- Post-upload SHA256 digest verification
- Installer-only allowlist enforcement

## Metadata Sync Checklist

- [x] `VERSION` = `1.18.4`
- [x] `frontend/package.json` version = `1.18.4`
- [x] `CHANGELOG.md` finalized with `[1.18.4]`
- [x] `.github/RELEASE_NOTES_v1.18.4.md` prepared
- [x] Release note/checklist/manifest docs created

## Post-Publish Verification Targets

- [ ] Release exists at tag `v1.18.4`
- [ ] Installer + `.sha256` sidecar present
- [ ] Asset digest matches workflow output
- [ ] No non-allowlisted assets remain
- [ ] Installer signature gate passed in workflow logs
