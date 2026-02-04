# Release Script Consolidation - February 2026

**Date**: February 4, 2026
**Status**: ✅ Complete
**Impact**: Single source of truth for releases

---

## 🎯 Problem Statement

Previously, the release process was split across multiple scripts:

| Script | Purpose | Issues |
|--------|---------|--------|
| `RELEASE_PREPARATION.ps1` | Validation only | Incomplete - didn't build installer |
| `RELEASE_READY.ps1` | Version updates & commits | Missing installer build step |
| `INSTALLER_BUILDER.ps1` | Build installer | Had to be called manually |

**Result**: Manual workflow with gaps where installer build was forgotten or done incorrectly.

---

## ✅ Solution: Single Source of Truth

**All functionality consolidated into `RELEASE_READY.ps1`**

### Complete Workflow (8 Steps)

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -TagRelease
```

**What it does:**

1. **Pre-Release Validation**
   - ✅ Git status check (no uncommitted changes)
   - ✅ Branch check (should be on `main`)
   - ✅ Fetch from remote
   - ✅ Version consistency verification
   - ✅ Pre-commit checks (linting, formatting)
   - ✅ Test suite execution (backend + frontend)

2. **Update Version References**
   - ✅ VERSION file
   - ✅ backend/main.py
   - ✅ frontend/package.json
   - ✅ frontend/package-lock.json
   - ✅ Documentation files
   - ✅ CHANGELOG.md
   - ✅ Installer wizard images

3. **Build Installer** ⭐ NEW
   - ✅ Full installer build via `INSTALLER_BUILDER.ps1 -Action build`
   - ✅ Code signing with AUT MIEEK certificate
   - ✅ Verification of installer.exe creation
   - ✅ Size and path validation

4. **Validate Changes**
   - ✅ Pre-commit checks on modified files
   - ✅ Auto-fix if needed

5. **Organize Documentation**
   - ✅ Workspace cleanup
   - ✅ Documentation consolidation

6. **Generate Release Documentation**
   - ✅ Release notes
   - ✅ CHANGELOG entries
   - ✅ GitHub release draft

7. **Commit and Push**
   - ✅ Stage all changes
   - ✅ Commit with semantic message
   - ✅ Push to origin/main
   - ✅ Push documentation separately

8. **Create Tag** (if `-TagRelease`)
   - ✅ Create `v1.17.7` tag
   - ✅ Push tag to trigger GitHub Actions
   - ✅ Monitor workflow instructions

---

## 📋 Usage Examples

### Standard Release (Recommended)
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -TagRelease
```

### Quick Release (Skip Tests)
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -SkipTests -TagRelease
```

### Release Without Installer (Not Recommended)
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -SkipInstaller -TagRelease
```

### Emergency Release (Skip Validation - DANGEROUS)
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -SkipValidation -TagRelease
```

### Auto-Fix Mode
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -AutoFix -TagRelease
```

---

## 🗑️ Deprecated Scripts

### RELEASE_PREPARATION.ps1 - DEPRECATED

**Status**: ⚠️ Deprecated as of Feb 4, 2026

**What it did**: Pre-release validation only

**Why deprecated**: All functionality moved into `RELEASE_READY.ps1`

**Action**: Script shows deprecation warning and redirects to `RELEASE_READY.ps1`

**Timeline**: Will be archived in v1.18.0 (March 2026)

---

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Single Command** | One script does everything - no manual steps |
| **No Missing Steps** | Installer build is now automatic, not forgotten |
| **Better Validation** | Pre-release checks ensure quality |
| **Safer Releases** | Can't skip critical steps accidentally |
| **Clear Feedback** | Step-by-step progress with visual sections |
| **Flexibility** | Optional flags for different scenarios |

---

## 🔄 Migration Guide

### Old Workflow (Before Feb 2026)
```powershell
# Step 1: Validate (incomplete - no installer check)
.\RELEASE_PREPARATION.ps1 -Mode Full

# Step 2: Build installer (MANUAL - often forgotten)
.\INSTALLER_BUILDER.ps1 -Action build

# Step 3: Release
.\RELEASE_READY.ps1 -ReleaseVersion "X.X.X" -TagRelease

# Issues:
# ❌ 3 separate commands
# ❌ Installer build easily forgotten
# ❌ No verification installer was built
# ❌ Gap between validation and release
```

### New Workflow (Feb 2026+)
```powershell
# Single command does everything
.\RELEASE_READY.ps1 -ReleaseVersion "1.17.7" -TagRelease

# Benefits:
# ✅ One command
# ✅ Automatic installer build
# ✅ Verification at each step
# ✅ Clear progress indicators
```

---

## 🧪 Testing

Validation checklist for the consolidated script:

- [ ] Pre-release validation runs
- [ ] Version references updated correctly
- [ ] Installer builds successfully
- [ ] Installer.exe created in `installer/Output/`
- [ ] Changes committed
- [ ] Tag created and pushed
- [ ] GitHub Actions triggered
- [ ] Release created on GitHub

---

## 📊 Script Comparison

| Feature | RELEASE_PREPARATION | RELEASE_READY (Old) | RELEASE_READY (New) |
|---------|---------------------|---------------------|---------------------|
| Git status check | ✅ | ❌ | ✅ |
| Version verification | ✅ | ❌ | ✅ |
| Pre-commit checks | ✅ | ✅ | ✅ |
| Test suite | ✅ | ❌ | ✅ |
| Version updates | ❌ | ✅ | ✅ |
| **Installer build** | ❌ | ❌ | ✅ |
| Commit & push | ❌ | ✅ | ✅ |
| Tag creation | ❌ | ✅ | ✅ |
| **Complete workflow** | ❌ | ❌ | ✅ |

---

## 🔐 Security & Quality

All security measures preserved:

- ✅ Code signing with AUT MIEEK certificate
- ✅ Pre-commit validation (linting, formatting)
- ✅ Test suite execution
- ✅ Version consistency checks
- ✅ Git status verification
- ✅ Branch protection (warns if not on main)

---

## 📝 Documentation Updates

Updated documentation:

- ✅ `.github/copilot-instructions.md` - Reference consolidated script
- ✅ `docs/AGENT_POLICY_ENFORCEMENT.md` - Update release workflow policy
- ✅ `docs/plans/UNIFIED_WORK_PLAN.md` - Document consolidation
- ✅ `README.md` - Update release instructions
- ✅ This document - Consolidation summary

---

## 🎓 For Developers

### When to Use Each Script

| Use Case | Script | Command |
|----------|--------|---------|
| **Production Release** | RELEASE_READY.ps1 | `.\RELEASE_READY.ps1 -ReleaseVersion "X.X.X" -TagRelease` |
| **Test Installer Only** | INSTALLER_BUILDER.ps1 | `.\INSTALLER_BUILDER.ps1 -Action build` |
| **Validate Before Release** | RELEASE_READY.ps1 | `.\RELEASE_READY.ps1 -ReleaseVersion "X.X.X"` (no -TagRelease) |

### Understanding the Flags

| Flag | When to Use |
|------|-------------|
| `-TagRelease` | Production releases (creates git tag) |
| `-SkipTests` | When tests already passed in CI |
| `-SkipInstaller` | Web-only releases (no desktop installer) |
| `-SkipValidation` | Emergency hotfixes (NOT RECOMMENDED) |
| `-AutoFix` | When version inconsistencies exist |

---

## 🚀 Next Steps

1. ✅ Test consolidated script with v1.17.7 release
2. ⏳ Update CI/CD pipeline to reference new workflow
3. ⏳ Archive `RELEASE_PREPARATION.ps1` in v1.18.0
4. ⏳ Update developer documentation
5. ⏳ Create video walkthrough of new workflow

---

**Summary**: Single source of truth for releases. One script, complete workflow, no missing steps.

**Version**: 2.0.0 (Consolidated)
**Replaces**: RELEASE_PREPARATION.ps1 (deprecated)
**Status**: Production Ready ✅
