# Installer Testing Tracker - v1.17.7

**Created**: February 5, 2026
**Installer Version**: 1.17.7
**Installer Location**: [GitHub Release v1.17.7](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.17.7)
**File**: `SMS_Installer_1.17.7.exe` (6.46 MB)
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
| 1 | **Fresh Install** | ⬜ Not Started | - | - | No prior version | - |
| 3 | **Upgrade v1.17.6 → v1.17.7** | ⬜ Not Started | - | - | In-place upgrade test | - |

### Priority 2: Edge Cases (Execute After Priority 1)

| # | Scenario | Status | Date | Duration | Notes | Issues Found |
|---|----------|--------|------|----------|-------|--------------|
| 2 | **Repair v1.17.7** | ⬜ Not Started | - | - | Same version repair | - |
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

<!-- Add issues here as they are discovered -->

#### Discovered Issues List

*None reported yet - testing in progress*

---

## 📋 Test Result Details

For each scenario you complete, add details below:

### Scenario 1: Fresh Install
**Status**: ⬜ Not Started
**Date Started**: -
**Date Completed**: -
**Tester Notes**: 

Key Checks Completed:
- [ ] Installer launched without errors
- [ ] Installation directory selected correctly
- [ ] Application installed to correct location
- [ ] Desktop shortcut created
- [ ] Start menu entry added
- [ ] First run (wizard/setup) works
- [ ] Backend service started (port 8000)
- [ ] Frontend (port 5173 or built-in server) started
- [ ] Database populated with initial data
- [ ] Login works with default credentials
- [ ] Application UI responsive and usable

**Issues Found**: 
- None / [List issues with their numbers]

**Duration**: _____ minutes
**Notes**:

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

**Overall Progress**: 0/8 scenarios completed (0%)

**By Priority**:
- Priority 1 (Critical): 0/2 completed (0%)
- Priority 2 (Edge Cases): 0/3 completed (0%)
- Priority 3 (Validation): 0/3 completed (0%)

**Time Invested So Far**: 0 hours

**Issues Found**: 0 total
- Critical: 0
- High: 0
- Medium: 0
- Low: 0

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
