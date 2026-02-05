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

```markdown
**Issue #X**: [Brief Description]
- Scenario: [Which test scenario]
- Steps to Reproduce:
  1. Step 1
  2. Step 2
  3. Step 3
- Expected Behavior: [What should happen]
- Actual Behavior: [What actually happened]
- Severity: [Critical/High/Medium/Low]
- Workaround: [If applicable]
- Screenshots: [If applicable]
```

### Issues Found During Testing

<!-- Add issues here as they are discovered -->

*No issues found yet - testing not started*

---

## 📊 Testing Progress Summary

**Overall Progress**: 0/8 scenarios completed (0%)

**By Priority**:
- Priority 1 (Critical): 0/2 completed (0%)
- Priority 2 (Edge Cases): 0/3 completed (0%)
- Priority 3 (Validation): 0/3 completed (0%)

**Time Invested**: 0 hours

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

**Estimated Total Time**: 2-3 hours for all 8 scenarios

---

**Last Updated**: February 5, 2026 (Created)  
**Next Update**: After first test scenario completion  
**Status**: Ready for testing execution
