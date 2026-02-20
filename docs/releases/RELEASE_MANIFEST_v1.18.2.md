# Release Manifest - v1.18.2

**Version:** 1.18.2  
**Date:** February 20, 2026  
**Type:** Patch release  
**Status:** Released

## Release Metadata

- Tag: `v1.18.2`
- Release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.2
- Published at: `2026-02-20T10:46:44Z`
- Branch lineage: `main`

## Artifacts

### Required assets (present)
- [x] `SMS_Installer_1.18.2.exe`
  - size: `26,115,744` bytes
  - digest: `sha256:1e98607670029b8ebed1b3337794dc79755cf810af2624bfcb53d99e47f6ebc0`
- [x] `SMS_Installer_1.18.2.exe.sha256`
  - size: `90` bytes
  - digest: `sha256:0dd681d3188bb3a7d1e417a3450960dc2e74d768ededec70cd6a5d18db6c4a5b`

## Scope Summary

- Hotfix release for installer runtime failure resolution.
- Release produced from corrected tag lineage (`v1.18.2`) to avoid immutable legacy workflow behavior.

## Key Commits in Scope

- `802a656ab` - hotfix(release): bump to 1.18.2 for installer runtime crash fix
- `e63060af5` - hardening(release): add non-blocking signer allowlist telemetry
- `2e8e61dc0` - hardening(release): configurable payload floor + post-upload digest gate
- `d8278ab9b` - fix(release): align payload guardrail with valid installer size
- `6ef59099a` - fix(release): signature gate self-signed-aware via thumbprint check
- `d9b28769c` - fix(release): enforce tag-lineage, mandatory signing, and payload gates

## Policy Gates

- [x] Release lineage gate enforced
- [x] Mandatory signing secrets enforced
- [x] Signature/thumbprint gate enforced
- [x] Payload floor gate enforced
- [x] Post-upload digest verification gate enforced
- [x] Installer-only release asset allowlist enforced

---

**Owner decision mode:** Solo developer approved patch lineage release.
