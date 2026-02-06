-
### Scenario 2: Repair v1.17.7 → v1.17.7
**Status**: ⚠ Partial
**Date Started**: Feb 5, 2026
**Date Completed**: Feb 5, 2026
**Tester Notes**: Running the installer again detected the existing v1.17.7 instance and immediately proceeded into a reinstall/repair flow. There was no explicit "Remove" option in the dialog, so uninstall could not be invoked from this path. Post-install backup directory received a new timestamped folder, but it did not include the database or `.env` copies as expected.

Key Checks Completed:
- [x] Installer detected existing v1.17.7 install
- [x] Repair/reinstall completed without errors
- [x] Backup folder created with timestamped name
- [ ] Dialog offered Modify/Repair/Remove choices (missing "Remove")
- [ ] Backup contains database dump or `.env` snapshots (not present)
- [x] Application files refreshed and Docker data preserved
- [x] Metadata updated with repair timestamp

**Issues Found**:
- Issue #4: Repair dialog lacks "Remove" option and backup folder misses db/.env contents

**Duration**: ≈15 minutes
**Notes**:
- Need to confirm Inno configuration supports displaying the full Modify/Repair/Remove wizard page
- Investigate why backup routine skipped db/.env copies during repair
# Installer Testing Tracker - v1.17.7

**Created**: February 5, 2026
**Installer Version**: 1.17.7
**Installer Location**: [GitHub Release v1.17.7](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.17.7)
**File**: `SMS_Installer_1.17.7.exe` (≈7.95 MB, Feb 5 rebuild)
**Status**: ⏳ READY FOR TESTING

---

## 📥 Pre-Testing Setup

### Download Installer

1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.17.7
2. Download: `SMS_Installer_1.17.7.exe` (6.46 MB)
3. Verify file size matches: 6.46 MB
4. Save to a known location (e.g., `C:\Downloads\`)

### Prepare Test Environment

- [ ] Windows machine available for testing
- [ ] Administrator privileges confirmed
- [ ] Backup important data (if existing installation)
- [ ] Docker Desktop installed (optional, can test without)
- [ ] Test scenarios prioritized (see below)

---

## 🧪 Test Scenarios Execution Tracker

### Priority 1: Critical Tests (Execute First)

| # | Scenario | Status | Date | Duration | Notes | Issues Found |
|---|----------|--------|------|----------|-------|--------------|
| 1 | **Fresh Install** | ⚠ Partial | Feb 5, 2026 | ≈20m | Welcome screen stuck to Greek locale; rest OK | Issue #3 |
| 3 | **Upgrade v1.17.6 → v1.17.7** | ⬜ Not Started | - | - | In-place upgrade test | - |

### Priority 2: Edge Cases (Execute After Priority 1)

| # | Scenario | Status | Date | Duration | Notes | Issues Found |
|---|----------|--------|------|----------|-------|--------------|
| 2 | **Repair v1.17.7** | ⚠ Partial | Feb 5, 2026 | ≈15m | Repair succeeded but no "Remove" option and backup missing .env/db files | Issue #4 |
| 4 | **Docker Running Upgrade** | ⬜ Not Started | - | - | Graceful container handling | - |
| 5 | **Docker Stopped Upgrade** | ⬜ Not Started | - | - | Standard upgrade flow | - |

### Priority 3: Uninstall & Validation (Execute Last)

| # | Scenario | Status | Date | Duration | Notes | Issues Found |
|---|----------|--------|------|----------|-------|--------------|
| 6 | **Uninstall (Data Preserved)** | ⬜ Not Started | - | - | Keep user data option | - |
| 7 | **Backup Integrity** | ⬜ Not Started | - | - | Verify backups valid | - |
| 8 | **Metadata Tracking** | ⬜ Not Started | - | - | install_metadata.txt | - |

---

## 📝 Testing Instructions

### How to Execute Each Scenario

**For Each Test**:
1. Open `installer/INSTALLER_TESTING_GUIDE.md`
2. Navigate to the specific scenario section
3. Follow step-by-step instructions
4. Check each verification checkpoint (✓)
5. Document results in table above
6. Note any issues found

**Status Values**:
- ⬜ Not Started
- 🔄 In Progress
- ✅ Passed
- ❌ Failed
- ⚠️ Partial (with notes)

**Duration**: Estimated time for each scenario (5-15 min)

---

## 🐛 Issues & Findings Log

### Issue Template

When you find an issue, copy this template and fill it in:

```markdown
**Issue #X**: [Brief Description]
- **Scenario**: [Which test scenario triggered this]
- **Steps to Reproduce**:
  1. Step 1
  2. Step 2
  3. Step 3
  4. Result/Error
- **Expected Behavior**: [What should happen]
- **Actual Behavior**: [What actually happened]
- **Severity**: [Critical/High/Medium/Low]
  - Critical: System won't install/upgrade/run
  - High: Feature broken, data lost, significant inconvenience
  - Medium: Feature works but has quirks, minor inconvenience
  - Low: Cosmetic issues, typos, occasional hiccups
- **Environment**: [OS version, Docker status, network, etc.]
- **Error Messages**: [Copy exact error text or screenshot URLs]
- **Workaround**: [If you found a way around it]
- **Screenshots/Attachments**: [Links to images if applicable]
- **Impact**: [Who is affected and how badly?]
- **Dependency**: [Does this block other tests?]
```

### Issues Found During Testing

#### Issue #1: Control Panel uninstall failed (missing `.dat` companion)
- **Status**: ✅ Fixed (Feb 5, 2026)
- **Summary**: Earlier builds renamed only `unins000.exe`, leaving `unins000.dat/.msg` behind and causing the Control Panel uninstaller to fail with "file not found". The installer now renames all three files to `unins{version}.*` and updates the registry accordingly.
- **Verification**: After every install/upgrade, confirm `C:\Program Files\SMS\unins1.17.7.exe/.dat/.msg` exist before running Scenario 6.
- **Fallback**: Manual uninstaller (`UNINSTALL_SMS_MANUALLY.ps1`) remains available but should no longer be required for standard flows.

#### Issue #2: Docker Manager logs shortcut crashed (PowerShell parser error)
- **Status**: ✅ Fixed (Feb 5, 2026)
- **Summary**: Option 5 (View Logs) used the CMD `||` operator inside PowerShell, triggering `InvalidEndOfLine`. The shortcut now shells into PowerShell 7 and checks `$LASTEXITCODE`, printing "Container not running or not found" if logs are unavailable.
- **Verification**: From the Docker Manager menu run option 5. No parser errors should appear; logs or the fallback message should be displayed.

#### Discovered Issues List

*Fixes above deployed; continue logging any new findings here.*

#### Issue #3: Welcome screen stuck on Greek locale
- **Scenario**: 1 (Fresh install)
- **Observed**: On a Greek-language Windows environment, the installer welcome screen rendered only in Greek even though the user attempted to select English. There was no option to switch back during the session.
- **Expected**: Language selector should respect the chosen language (and at least default to English when explicitly selected) regardless of OS locale.
- **Severity**: Low (usability / localization correctness)
- **Environment**: Windows 10 (system locale Greek), installer build Feb 5, 2026
- **Workaround**: None during the session (must proceed in Greek)
- **Impact**: Non-Greek-speaking users on Greek-configured machines cannot read the welcome/license text.
- **Status**: 🟡 Fix implemented (Feb 5, 2026) — `ShowLanguageDialog` is now forced to `yes`, so the installer always prompts for the preferred language regardless of OS locale. Pending validation during the next Scenario 1 run.

#### Issue #4: Repair flow missing Remove option and backup contents
- **Scenario**: 2 (Repair v1.17.7)
- **Observed**: Re-running the installer detected the existing version and immediately offered a repair path without presenting the expected Modify/Repair/Remove choice. The generated backup folder contained only subset files (no database or `.env` copies).
- **Expected**: Inno Setup maintenance page should show Modify/Repair/Remove (or equivalent) and the backup routine should include database plus `.env` files as documented.
- **Severity**: Medium (repair/uninstall UX + potential data loss if backups incomplete)
- **Environment**: Same Windows build as Scenario 1, installer build Feb 5, 2026
- **Workaround**: Use Control Panel uninstall for removal; manually back up `.env` if needed.
- **Status**: ✅ Owner accepted (Feb 5, 2026) — Since the reinstall path successfully repairs the installation, the missing maintenance page options are acceptable for now. Backup completeness will be revisited only if future tests show data loss.

#### Issue #5: Docker Manager option 1 opens two browser tabs
- **Scenario**: Post-install smoke test via `docker_manager.bat`
- **Observed**: Choosing menu option `1` (“Start SMS Docker container”) starts the container correctly but launches the default browser twice, producing two tabs pointing to the same URL.
- **Expected**: After the container starts, only a single tab/window should be opened to the app URL.
- **Severity**: Low (minor UX annoyance)
- **Environment**: Same machine as Scenarios 1-2, Docker Desktop running, Feb 5 installer build.
- **Workaround**: Close the duplicate tab manually.
- **Status**: ✅ Verified (Feb 5, 2026) — Smoke test confirmed only a single browser tab opens after option 1; relying on `DOCKER.ps1` resolved the duplicate tab.

---

## 📋 Test Result Details

For each scenario you complete, add details below:

### Scenario 1: Fresh Install
**Status**: ⚠ Partial
**Date Started**: Feb 5, 2026
**Date Completed**: Feb 5, 2026
**Tester Notes**: Install completed successfully on a Greek-locale Windows build. All shortcuts/files/Docker assets were created and the app served via http://localhost:8080. However, the welcome screen rendered only in Greek even when English was expected, so localization toggle appears locked to system language.

Key Checks Completed:
- [x] Installer launched without errors
- [x] Installation directory selected correctly
- [x] Application installed to correct location
- [x] Desktop shortcut created
- [x] Start menu entry added
- [x] First run (wizard/setup) works
- [x] Backend service started (port 8000)
- [x] Frontend (port 5173 or built-in server) started / Docker route responding (8080)
- [x] Database populated with initial data
- [ ] Login works with default credentials (not explicitly tested)
- [ ] Application UI responsive and usable (beyond landing page)

**Issues Found**:
- Issue #3: Welcome screen locked to Greek locale even when English is selected

**Duration**: ≈20 minutes
**Notes**:
- Metadata file present with `InstallationType: Fresh`, correct version/date stamps
- Docker Desktop + containers provisioned successfully

---

### Scenario 3: Upgrade v1.17.6 → v1.17.7
**Status**: ⬜ Not Started
**Date Started**: -
**Date Completed**: -
**Tester Notes**:

Key Checks Completed:
- [ ] Existing installation detected correctly
- [ ] Upgrade option offered (repair vs full)
- [ ] Selected upgrade/repair
- [ ] Installation proceeded without errors
- [ ] Services stopped gracefully
- [ ] New files applied
- [ ] Database migrations ran successfully
- [ ] Services restarted successfully
- [ ] Old version removed
- [ ] User data preserved
- [ ] Application works with upgraded data
- [ ] **Legacy detector validation**: Remove (or temporarily rename) the HKLM/HKCU uninstall entries so only legacy launchers (e.g., `SMS Toggle.bat/.cmd`, `docker_manager.bat`, or `VERSION`) remain in `C:\Program Files\SMS`, then rerun the installer and confirm it still finds the installation path and shows the correct version before proceeding. This ensures the hardened filesystem-based detection works as designed.
  > Tip: Back up the uninstall keys first (`reg export ...`) and restore them afterward (`reg import ...`). Detailed commands live in the testing guide scenario steps.

**Issues Found**:
- None / [List issues with their numbers]

**Duration**: _____ minutes
**Notes**:

---

### Scenario 4: Docker Running During Upgrade
**Status**: ⬜ Not Started
**Date Started**: -
**Date Completed**: -
**Tester Notes**:

Key Checks Completed:
- [ ] Docker containers verified running before upgrade
- [ ] Upgrade started while Docker active
- [ ] Containers handled gracefully (stopped or preserved)
- [ ] Services migrated correctly
- [ ] Data persisted through upgrade
- [ ] Docker containers restarted post-upgrade
- [ ] System functional after upgrade

**Issues Found**:
- None / [List issues with their numbers]

**Duration**: _____ minutes
**Notes**:

*No issues found yet - testing not started*

---

## 📊 Testing Progress Summary

**Overall Progress**: 0/8 scenarios fully passed (2 partial, 6 not started)

**Testing Status (Feb 5, 2026)**: Phase terminated early at owner's request. Additional scenarios cannot be verified on the current workstation, so manual installer testing is paused until a suitable environment is available.

**By Priority**:
- Priority 1 (Critical): 0/2 completed (2 partial)
- Priority 2 (Edge Cases): 0/3 completed (1 partial)
- Priority 3 (Validation): 0/3 completed (0 started)

**Time Invested So Far**: ≈35 minutes (Scenarios 1-2)

**Issues Found**: 2 new (total tracked: 4)
- Critical: 0
- High: 0
- Medium: 1 (Issue #4)
- Low: 1 (Issue #3)

---

## ✅ Completion Checklist

### Before Starting
- [ ] Downloaded installer from GitHub
- [ ] Verified file size (6.46 MB)
- [ ] Read testing guide overview
- [ ] Prepared test environment

### During Testing
- [ ] Priority 1: Fresh install tested
- [ ] Priority 1: Upgrade tested
- [ ] Priority 2: All edge cases tested
- [ ] Priority 3: Uninstall tested
- [ ] Priority 3: Backup integrity verified
- [ ] Priority 3: Metadata tracking verified
- [ ] All issues documented
- [ ] Screenshots captured (if issues found)

### After Testing
- [ ] Update this tracker with final results
- [ ] Create GitHub issues for any bugs found
- [ ] Update UNIFIED_WORK_PLAN.md with testing status
- [ ] Archive test results for future reference
- [ ] Decide on next release actions (if needed)

---

## 📚 Related Documentation

- **Testing Guide**: [installer/INSTALLER_TESTING_GUIDE.md](installer/INSTALLER_TESTING_GUIDE.md)
- **Systematic Assessment**: [SYSTEMATIC_TASK_EXECUTION_SUMMARY.md](SYSTEMATIC_TASK_EXECUTION_SUMMARY.md)
- **Work Plan**: [docs/plans/UNIFIED_WORK_PLAN.md](docs/plans/UNIFIED_WORK_PLAN.md)
- **Installer Fixes**: [installer/INSTALLER_FIXES_APPLIED_FEB3.md](installer/INSTALLER_FIXES_APPLIED_FEB3.md)

---

## 🎯 Quick Start Guide

**To begin testing right now**:

1. **Download installer**: GitHub Release v1.17.7
2. **Open testing guide**: `installer/INSTALLER_TESTING_GUIDE.md`
3. **Start with Scenario 1**: Fresh Install (10-15 min)
4. **Update this tracker**: Mark status, duration, notes
5. **Continue to next scenario**: Follow priority order

**What Requires Your Action**:
- 🔨 Manual installer testing (download & run exe)
- 📝 Document findings in tracker
- 🎯 Prioritize features for next phase based on feedback

**Estimated Total Time**: 2-3 hours for all 8 scenarios (when owner decides to execute)

---

**Last Updated**: February 5, 2026 (Created)
**Next Update**: When first scenario is completed
**Status**: Ready for owner to begin testing when decided
