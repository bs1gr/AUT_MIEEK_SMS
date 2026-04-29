# Release Procedure - Mandatory Verification Gates

**Version**: 1.0
**Date**: March 1, 2026
**Status**: MANDATORY - All releases must follow this procedure
**Authority**: Project release policy

---

## 🚨 CRITICAL RULE: NEVER Upload Unverified Artifacts to GitHub

**VIOLATION INCIDENT (vv1.18.21)**:
- ❌ Built installer and uploaded WITHOUT verification
- ❌ Violated Policy 0.1: "DO NOT COMMIT unless 100% verified first"
- ❌ Created unverified artifacts in production release
- ✅ **CORRECTED**: Artifacts removed, procedure documented

**MANDATORY FROM NOW ON**: All releases follow this exact procedure. NO EXCEPTIONS.

---

## Three-Phase Release Procedure

### Phase 1: Code Release (VERIFICATION COMPLETE ✓)

**What Happens**:
- Code changes committed to main branch
- All tests pass (unit, E2E, integration)
- Code quality checks pass (linting, type checking)
- Documentation prepared and committed
- Git tag created (v1.x.x format)
- GitHub release created with release notes
- **NO INSTALLER ARTIFACTS YET**

**Verification Gates**:
- ✅ Run `.\COMMIT_READY.ps1 -Full` (must pass)
- ✅ Run `.\RUN_TESTS_BATCH.ps1` (all tests pass)
- ✅ Verify linting: `python -m ruff check backend/`
- ✅ Verify frontend: `npm --prefix frontend run lint`
- ✅ All 2,600+ tests passing

**Who Does This**: Feature developer + AI assistant

**When Done**: Ready for Phase 2 (installer build)

---

### Phase 2: Installer Build & Verification (⏳ MUST VERIFY BEFORE UPLOAD)

**CRITICAL**: This is where vv1.18.21 is RIGHT NOW ⏳

**What Happens**:
1. **Build Infrastructure Check**
   ```powershell
   .\INSTALLER_BUILDER.ps1 -Action validate -Version "X.X.X"
   # Validates installer inputs and build prerequisites before compiling
   ```

2. **Build Installer**
   ```powershell
   .\INSTALLER_BUILDER.ps1 -Action build
   # Output: SMS_Installer_X.X.X.exe
   ```

3. **Comprehensive Validation** (95+ checkpoints)
   - Execute [DEPLOYMENT_CHECKLIST](DEPLOYMENT_CHECKLIST_vv1.18.21.md): Pre-Deployment section
   - Verify digital signature: `signtool verify /v SMS_Installer_X.X.X.exe`
   - Verify checksum matches
   - Verify file version/product version
   - Test installer: Fresh install, upgrade, repair scenarios
   - Verify uninstall cleans properly

4. **Upload to GitHub Release**
   ```powershell
   gh release upload vX.X.X SMS_Installer_X.X.X.exe
   ```

**Verification Gates** (EACH MUST PASS):
- ✅ InnoSetup 6.x available and working
- ✅ Code signing certificate available and valid
- ✅ Installer builds without errors
- ✅ Digital signature validates (Authenticode)
- ✅ File version matches release version
- ✅ SHA-256 checksum generated and matches
- ✅ Smoke test passes (extract/inspect rig)
- ✅ Fresh install test passes
- ✅ Upgrade test passes
- ✅ Repair test passes
- ✅ Uninstall test passes

**Who Does This**: Release manager / operations team

**When Done**: Ready for Phase 3 (deployment)

**⚠️ IF ANY TEST FAILS**:
- Stop immediately
- Do NOT upload installer
- Debug the issue
- Rebuild and re-test
- Only then proceed to upload

---

### Phase 3: Production Deployment (⏳ DEPLOY TO PRODUCTION)

**What Happens**:
- System administrator downloads verified installer
- Verifies checksum: `Get-FileHash SMS_Installer_X.X.X.exe -Algorithm SHA256`
- Deploys to production using installer
- Executes [DEPLOYMENT_CHECKLIST](DEPLOYMENT_CHECKLIST_vv1.18.21.md): Deployment & Validation sections
- Monitors system for 24+ hours
- Records deployment completion

**Verification Gates**:
- ✅ Checksum verified before installation
- ✅ All 95+ deployment checks pass
- ✅ System health verified (health endpoint 200)
- ✅ All services responding normally
- ✅ Database migrations complete
- ✅ API endpoints responding
- ✅ Dashboard loads correctly
- ✅ User authentication working
- ✅ 24-hour monitoring complete with zero incidents

**Who Does This**: System administrator / operations team

**When Done**: Release complete and live in production

---

## Release Approval Checklist

### Before Phase 2 Starts

- [ ] Phase 1 complete (code release verified)
- [ ] All tests passing (2,600+)
- [ ] Release notes published
- [ ] Documentation committed
- [ ] GitHub release created with notes

### Before Phase 3 Starts

- [ ] Installer built successfully
- [ ] All verification gates pass (95+ checks)
- [ ] Digital signature validates
- [ ] Checksum verified
- [ ] Smoke tests pass (fresh, upgrade, repair)
- [ ] Installer uploaded to GitHub release
- [ ] Release manager approval obtained

### Before Production Deployment

- [ ] System administrator confirms readiness
- [ ] Maintenance window scheduled (if needed)
- [ ] Backup completed
- [ ] Rollback procedure documented
- [ ] Monitoring configured
- [ ] Team notified of deployment window

---

## What NOT To Do

❌ **NEVER**:
- Upload installers to GitHub without Phase 2 verification complete
- Skip any verification gate in Phase 2
- Deploy to production without Phase 3 verification complete
- Build installers without code quality checks passing
- Upload unverified artifacts as "ready to test"
- Combine multiple phases into one step

---

## Historical Incident: vv1.18.21

### What Happened
- ✅ Phase 1 completed correctly
- ❌ Skipped Phase 2 verification gates
- ❌ Built installer WITHOUT running validation tests
- ❌ Uploaded unverified installer directly to GitHub
- ❌ Did NOT test fresh install, upgrade, repair scenarios
- ✅ **CORRECTED**: Artifacts removed, procedure documented

### Root Cause
- Assumed build success = verified installer
- Did not follow documented release procedure
- Violated Policy 0.1: "DO NOT COMMIT unless 100% verified first"
- Applied to artifacts as well as code

### How It Was Fixed
1. Removed unverified assets from GitHub release
2. Added clear notice about proper procedure
3. Documented three-phase release process
4. Made this procedure mandatory going forward

### Lesson Learned
**"Built" ≠ "Verified" ≠ "Deployed"**

Each phase has separate verification gates. You cannot skip to final phase without passing all intermediate verification gates. Production reliability depends on this discipline.

---

## Timeline for vv1.18.21

| Phase | Status | Completion Date | Next Action |
|-------|--------|-----------------|------------|
| **Phase 1: Code Release** | ✅ COMPLETE | March 1, 2026 17:00 | Proceed to Phase 2 |
| **Phase 2: Installer Build & Verify** | ⏳ PENDING | TBD | Follow verification gates exactly |
| **Phase 3: Deployment** | ⏳ PENDING | TBD | After Phase 2 verification passes |

---

## Commands Reference

```powershell
# Phase 1: Code Release (COMPLETE ✓)
.\COMMIT_READY.ps1 -Full           # Verify code quality
.\RUN_TESTS_BATCH.ps1              # Verify all tests pass
git tag vv1.18.21                    # Create release tag
gh release create vv1.18.21          # Create GitHub release

# Phase 2: Installer Build & Verify (⏳ NEXT)
.\INSTALLER_BUILDER.ps1 -Action validate -Version "X.X.X"     # Check build prerequisites
.\INSTALLER_BUILDER.ps1 -Action build            # Build installer
# Then: Run 95+ verification checkpoints manually
gh release upload vv1.18.21 SMS_Installer_1.18.5.exe

# Phase 3: Production Deployment (⏳ AFTER PHASE 2)
# Download installer from GitHub release
# Verify checksum
# Run installer with verification steps in DEPLOYMENT_CHECKLIST
```

---

## Escalation & Help

If you encounter issues during any phase:

1. **Phase 1 Issues**: Code problems, failing tests
   - Fix code, re-run tests, re-commit
   - Do NOT proceed to Phase 2 until all tests pass

2. **Phase 2 Issues**: Installer build fails, verification gates fail
   - Debug build environment
   - Fix issues, rebuild
   - Do NOT upload to GitHub until ALL verification gates pass

3. **Phase 3 Issues**: Deployment problems, system not responding
   - Execute rollback procedure
   - Investigate root cause
   - Fix issue, rebuild installer, re-test
   - Only then attempt re-deployment

**CRITICAL**: Never proceed to next phase if current phase verification gates fail.

---

**Last Updated**: March 1, 2026
**Status**: MANDATORY - All releases must follow this procedure
**Authority**: Project release policy with mandatory enforcement
