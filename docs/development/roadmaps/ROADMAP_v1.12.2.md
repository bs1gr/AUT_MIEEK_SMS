# v1.18.3 Roadmap & Planning

**Created**: 2025-12-12
**Status**: Planning
**Baseline**: v1.18.3 (Automation Infrastructure Release)
**Type**: Patch Release - Bug Fixes & Polish
**Target Release**: 2025-12-15 (3-day sprint)

---

## Executive Summary

v1.18.3 successfully delivered **automated release infrastructure** with SHA256 verification, secure certificate handling, and comprehensive diagnostics. v1.18.3 will be a **focused patch release** addressing the post-install issue discovered in v1.18.3 and polishing the automation workflow.

### Key Achievements from v1.18.3

- ✅ Automated installer builds (33s end-to-end)
- ✅ SHA256 hash verification infrastructure
- ✅ Secure certificate import (ready for secrets)
- ✅ Enhanced diagnostics for troubleshooting
- ✅ 100% automated release workflow
- ⚠️ **Issue Discovered**: Missing DOCKER_TOGGLE.vbs causes post-install error

---

## Phase 1: Critical Bug Fixes (Day 1) - IN PROGRESS

### 1.1 Fix Missing DOCKER_TOGGLE.vbs ✅

**Priority**: CRITICAL | **Effort**: Small | **Impact**: High
**Status**: ✅ COMPLETE (2025-12-12)

**Problem:**
- Desktop shortcut fails with Greek error: "Δεν είναι δυνατή η εύρεση του αρχείου δέσμης ενεργειών"
- Installer references `DOCKER_TOGGLE.vbs` but file was not in repository
- All shortcuts and icons attempt to launch missing file

**Solution:**
- [✅] Created DOCKER_TOGGLE.vbs with silent VBScript execution
- [✅] Added auto-detection of container state
- [✅] Implemented toggle logic (start if stopped, stop if running)
- [✅] Added error handling with user notifications
- [✅] Updated installer manifest to include the file
- [✅] Committed fix (f5721c46)

**Expected Benefit:**
- Desktop shortcut works immediately after install
- No more post-install errors
- Better user experience for non-technical users

---

### 1.2 Validate Installer Completeness 🔄

**Priority**: HIGH | **Effort**: Small | **Impact**: Medium
**Status**: Planned

**Objectives:**
- Ensure all referenced files exist in repository
- Verify all shortcuts have valid targets
- Test clean installation flow

**Tasks:**
- [ ] Audit all `Source:` entries in SMS_Installer.iss
- [ ] Cross-reference with repository files
- [ ] Create automated validation script
- [ ] Test desktop shortcut functionality
- [ ] Test start menu shortcuts
- [ ] Verify all icons load correctly

**Validation Checklist:**

```powershell
# Files that must exist:

- DOCKER.ps1
- DOCKER_TOGGLE.vbs (NEW)
- NATIVE.ps1
- COMMIT_READY.ps1
- favicon.ico
- run_docker_install.cmd
- All wizard images (wizard_image.bmp, wizard_small.bmp)
- Language files (installer_welcome_el.txt, etc.)

```text
---

## Phase 2: Release Workflow Polish (Day 2)

### 2.1 Enable Code Signing with Secrets 🔒

**Priority**: MEDIUM | **Effort**: Small | **Impact**: Medium
**Status**: Planned

**Objectives:**
- Configure GitHub secrets for code signing
- Test signed installer production
- Verify Windows SmartScreen compatibility

**Tasks:**
- [ ] Generate/obtain production code signing certificate
- [ ] Convert PFX to base64 for secrets
- [ ] Add GitHub secrets:
  - `CODESIGN_PFX_BASE64`
  - `CODESIGN_PFX_PASSWORD`
- [ ] Test workflow with signing enabled
- [ ] Verify signature on downloaded installer
- [ ] Document certificate renewal process

**Expected Benefit:**
- Installer shows verified publisher (AUT MIEEK)
- No Windows SmartScreen warnings
- Professional installation experience

---

### 2.2 Improve Workflow Diagnostics 📊

**Priority**: LOW | **Effort**: Small | **Impact**: Low
**Status**: Planned

**Objectives:**
- Add more detailed step-by-step logging
- Improve error messages
- Add timing metrics for each stage

**Tasks:**
- [ ] Add step duration tracking
- [ ] Log file sizes at each stage
- [ ] Add Greek encoding validation output
- [ ] Improve failure messages with actionable guidance
- [ ] Add summary table at workflow end

**Expected Output:**

```text
=== Build Summary ===
Version Verification:  ✅ 0.8s
Greek Encoding:        ✅ 0.3s
Wizard Images:         ✅ 0.5s
Inno Setup Compile:    ✅ 3.2s
Code Signing:          ⚠️  Skipped (no secrets)
SHA256 Calculation:    ✅ 0.1s
Asset Upload:          ✅ 0.4s
Total Duration:        5.3s

```text
---

## Phase 3: Documentation Updates (Day 3)

### 3.1 Update Troubleshooting Guides 📖

**Priority**: MEDIUM | **Effort**: Small | **Impact**: Medium
**Status**: Planned

**Objectives:**
- Document DOCKER_TOGGLE.vbs fix
- Add post-install verification steps
- Update known issues section

**Tasks:**
- [ ] Update FRESH_DEPLOYMENT_TROUBLESHOOTING.md
- [ ] Add DOCKER_TOGGLE.vbs section to DESKTOP_SHORTCUT_GUIDE.md
- [ ] Document workaround for v1.18.3 users
- [ ] Update CHANGELOG.md with v1.18.3 notes
- [ ] Add troubleshooting flowchart for shortcut issues

---

### 3.2 Complete Release Audit 📋

**Priority**: LOW | **Effort**: Small | **Impact**: Low
**Status**: Planned

**Tasks:**
- [ ] Create RELEASE_AUDIT_v1.18.3.md
- [ ] Document all changes since v1.18.3
- [ ] Record test results
- [ ] Update CI/CD pipeline guide if needed
- [ ] Add lessons learned section

---

## Success Criteria

### Release v1.18.3 Success Requires:

1. ✅ DOCKER_TOGGLE.vbs included in installer
2. ⏳ Desktop shortcut works on fresh install
3. ⏳ All referenced files exist in repository
4. ⏳ Installer builds without warnings
5. ⏳ SHA256 hash verified
6. ⏳ No regressions from v1.18.3
7. ⏳ Documentation updated

### Optional Goals (If Time Permits):

- 🔒 Code signing enabled with secrets
- 📊 Enhanced workflow diagnostics
- 📖 Comprehensive troubleshooting guide

---

## Timeline & Milestones

| Day | Milestone | Deliverable |
|-----|-----------|-------------|
| 1 (Dec 12) | ✅ Fix DOCKER_TOGGLE.vbs | Committed & pushed |
| 1-2 | Validate installer completeness | Audit report |
| 2 | (Optional) Enable code signing | Signed installer |
| 2-3 | Polish workflow diagnostics | Enhanced logs |
| 3 | Update documentation | Updated guides |
| 3 | Release v1.18.3 | Installer + release notes |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing files discovered | Medium | High | Automated validation script |
| Signing certificate issues | Low | Medium | Keep unsigned as fallback |
| Workflow regression | Low | Medium | Test in branch before merge |
| Documentation gaps | Low | Low | Use v1.18.3 as template |

---

## Testing Strategy

### Manual Testing (Required):

1. **Clean Installation Test**
   - Uninstall any previous version
   - Install v1.18.3 from scratch
   - Verify desktop shortcut works
   - Test start menu shortcuts
   - Verify Docker toggle functionality

2. **Upgrade Test**
   - Install v1.18.3
   - Upgrade to v1.18.3
   - Verify no data loss
   - Check shortcuts still work

3. **Shortcut Functionality Test**
   - Double-click desktop shortcut
   - Verify container starts
   - Double-click again
   - Verify container stops
   - Check for error messages

### Automated Testing:

- ✅ Version consistency check (VERIFY_VERSION.ps1)
- ✅ Backend tests (pytest)
- ✅ Frontend tests (vitest - fast suite)
- ✅ Workflow execution (GitHub Actions)

---

## Post-Release Actions

### Immediate (Day 3):

1. Tag release as v1.18.3
2. Trigger automated workflow
3. Verify installer asset uploaded
4. Download and test installer locally
5. Update release notes with SHA256
6. Announce release (if public)

### Follow-up (Week 1):

1. Monitor GitHub issues for installer problems
2. Collect user feedback
3. Update troubleshooting docs with new issues
4. Plan v1.18.3 feature scope

---

## Future Considerations (v1.18.3+)

Based on v1.18.3 experience:

### Release Automation Enhancements:

- Multi-platform installers (ARM, Linux AppImage)
- Automatic changelog generation from commits
- Release notes template automation
- Installer testing in CI/CD
- Signature verification in workflow

### Developer Experience:

- One-click development environment setup
- Automated dependency updates
- Pre-commit hook improvements
- Better error messages in scripts

### Operations:

- Monitoring dashboard for releases
- Automatic rollback on critical failures
- Staged rollout support
- Beta/RC release channels

---

## Notes

- v1.18.3 is intentionally small-scope (patch release)
- Focus on quality and completeness over new features
- Keep automation infrastructure stable
- Build confidence in release process
- Set foundation for larger v1.18.3 release

**Next Major Release**: v1.18.3 (Feature Release, TBD)
