# Release Scripts Overview

**Last Updated**: January 6, 2026
**Purpose**: Clarify the purpose and relationship between all release-related scripts

---

## 📋 Script Inventory

### 1. RELEASE_WITH_DOCS.ps1 ⭐ **PRIMARY ORCHESTRATOR**

**Purpose**: Complete end-to-end release automation from preparation to GitHub Release creation
**Created**: Previous session ($11.15.2 era)
**Scope**: Full release workflow

**What it does**:
1. Runs release preparation validation (`RELEASE_PREPARATION.ps1`)
2. Generates release documentation (`GENERATE_RELEASE_DOCS.ps1`)
3. Commits documentation changes
4. Creates git tag and triggers release workflows (`RELEASE_READY.ps1`)

**Use when**: You want a fully automated release from start to finish

**Command**:
```powershell
.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.16.0" -Mode Quick
```

---

### 2. RELEASE_PREPARATION.ps1

**Purpose**: Pre-release validation and quality checks
**Scope**: Code quality gate before release

**What it does**:
- Git status checks (clean working directory)
- Version verification across all files
- Pre-commit checks (format, lint, organize imports)
- Test suites (backend + frontend)
- Installer builder verification

**Modes**:
- `Quick`: Basic checks + pre-commit (~5 min)
- `Full`: All checks + all tests (~15-40 min)
- `Tests`: Only run tests (~10-20 min)

**Use when**: You want to validate readiness before release

**Command**:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
```

---

### 3. GENERATE_RELEASE_DOCS.ps1

**Purpose**: Automatic documentation generation from git commits
**Scope**: Release notes and changelog creation

**What it does**:
- Analyzes git commits since last release tag
- Generates `RELEASE_NOTES_v{version}.md`
- Updates `CHANGELOG.md` with new entries
- Creates `GITHUB_RELEASE_v{version}.md` template

**Use when**: You need to generate release documentation from git history

**Command**:
```powershell
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.16.0"
```

---

### 4. RELEASE_READY.ps1

**Purpose**: Git tagging and release workflow trigger
**Scope**: Final release execution step

**What it does**:
- Updates version references across all files
- Creates git tag (if `-TagRelease` specified)
- Triggers GitHub Actions release workflow
- Updates documentation version references

**Use when**: All checks passed, docs committed, ready to tag and release

**Command**:
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.16.0" -TagRelease
```

---

### 5. RELEASE_HELPER.ps1 ⭐ **POST-RELEASE ASSISTANT**

**Purpose**: Interactive helper for GitHub Release creation/update
**Created**: January 6, 2026 (this session)
**Scope**: GitHub Release management only

**What it does**:
- Validates release readiness
- Copies release body to clipboard (manual workflow)
- Opens GitHub Release UI
- **Creates GitHub Release via gh CLI** (automated workflow)
- Updates existing GitHub Releases
- Helps create GitHub Issues from templates

**Use when**:
- Code is already tagged/released
- Need to create/update the GitHub Release UI
- Want to create Phase 2 issues

**Commands**:
```powershell
# Manual workflow
.\RELEASE_HELPER.ps1 -Action ValidateRelease
.\RELEASE_HELPER.ps1 -Action OpenGitHub
.\RELEASE_HELPER.ps1 -Action CopyRelease

# Automated workflow (NEW - Jan 6, 2026)
.\RELEASE_HELPER.ps1 -Action CreateRelease          # Current version
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2  # Custom version
```

---

### 6. UPDATE_RELEASE.ps1 ⚠️ **ONE-TIME USE - CAN DELETE**

**Purpose**: One-off script to update $11.15.2 GitHub Release
**Created**: January 6, 2026 (this session)
**Scope**: Single-use for $11.15.2 only

**What it does**:
- Hardcoded to update $11.15.2 specifically
- Extracts release body from `GITHUB_RELEASE_$11.15.2.md`
- Updates GitHub Release via gh CLI

**Status**: ⚠️ **DEPRECATED** - Functionality now in `RELEASE_HELPER.ps1 -Action CreateRelease`

**Recommendation**: **DELETE THIS FILE** - Use `RELEASE_HELPER.ps1` instead

---

## 🎯 Complete Release Workflows

### Workflow A: Fully Automated (Recommended)

**Use Case**: New release from scratch

```powershell
# One command does everything
.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.16.0" -Mode Quick

# What happens:
# 1. Validates code quality ✅
# 2. Generates release docs ✅
# 3. Commits documentation ✅
# 4. Creates git tag ✅
# 5. Triggers GitHub Actions ✅
# → GitHub Actions creates installer + draft release

# Then manually:
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2  # Publish GitHub Release
```

**Timeline**: ~10 minutes (Quick mode)

---

### Workflow B: Step-by-Step (More Control)

**Use Case**: You want to review each step

```powershell
# Step 1: Validate
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix

# Step 2: Generate docs
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.16.0"

# Step 3: Review and commit docs
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for $11.15.2"

# Step 4: Tag and trigger release
.\RELEASE_READY.ps1 -ReleaseVersion "1.16.0" -TagRelease

# Step 5: Create GitHub Release (after Actions complete)
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2
```

**Timeline**: ~15 minutes (with review time)

---

### Workflow C: Manual Documentation

**Use Case**: You wrote release notes manually

```powershell
# Step 1: Validate
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Step 2: Skip auto-generation, write manually:
# - Create docs/releases/RELEASE_NOTES_$11.15.2.md
# - Create docs/releases/GITHUB_RELEASE_$11.15.2.md
# - Update CHANGELOG.md

# Step 3: Commit
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for $11.15.2"

# Step 4: Tag
.\RELEASE_READY.ps1 -ReleaseVersion "1.16.0" -TagRelease

# Step 5: Create GitHub Release
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2
```

---

## 🔄 Differences Between Scripts

| Feature | RELEASE_WITH_DOCS.ps1 | RELEASE_HELPER.ps1 | UPDATE_RELEASE.ps1 |
|---------|----------------------|-------------------|-------------------|
| **Purpose** | Full release automation | Post-release GitHub UI | One-time $11.15.2 update |
| **Scope** | Pre-release → Git tag | GitHub Release only | Single release update |
| **When to use** | New release prep | After code tagged | **NEVER (deprecated)** |
| **Validates code** | ✅ Yes | ❌ No | ❌ No |
| **Generates docs** | ✅ Yes (from commits) | ❌ No | ❌ No |
| **Creates git tag** | ✅ Yes | ❌ No | ❌ No |
| **Creates GitHub Release** | ❌ No (Actions does) | ✅ Yes (via gh CLI) | ✅ Yes (hardcoded) |
| **Updates GitHub Release** | ❌ No | ✅ Yes | ✅ Yes ($11.15.2 only) |
| **Interactive** | ❌ No | ✅ Yes | ❌ No |
| **Reusable** | ✅ Yes | ✅ Yes | ❌ No ($11.15.2 only) |
| **Status** | ✅ Active | ✅ Active | ⚠️ **DELETE** |

---

## 🧹 Cleanup Recommendation

**DELETE** `UPDATE_RELEASE.ps1` - It's now redundant:

```powershell
# Old way (UPDATE_RELEASE.ps1 - hardcoded $11.15.2):
.\UPDATE_RELEASE.ps1

# New way (RELEASE_HELPER.ps1 - any version):
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2
```

The functionality is fully replicated in `RELEASE_HELPER.ps1` with better:
- ✅ Version flexibility (not hardcoded)
- ✅ Error handling (checks if release exists)
- ✅ Validation (checks gh CLI auth)
- ✅ Help system (`-Action Help`)
- ✅ Multiple modes (create/update/validate)

---

## 📖 Quick Reference

### I want to...

**Start a new release**: `.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.16.0"`

**Check if ready to release**: `.\RELEASE_PREPARATION.ps1 -Mode Quick`

**Generate release notes**: `.\GENERATE_RELEASE_DOCS.ps1 -Version "1.16.0"`

**Tag the release**: `.\RELEASE_READY.ps1 -ReleaseVersion "1.16.0" -TagRelease`

**Create GitHub Release**: `.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2`

**Update existing GitHub Release**: `.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2` (detects existing)

**Create Phase 2 issues**: `.\RELEASE_HELPER.ps1 -Action CopyIssue`

---

## 🎯 Recommended Workflow for $11.15.2+

```powershell
# 1. Complete automation
.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.16.0" -Mode Quick

# 2. Wait for GitHub Actions to build installer (~5 min)

# 3. Create/publish GitHub Release
.\RELEASE_HELPER.ps1 -Action CreateRelease -Tag $11.15.2

# Done! 🎉
```

**Total time**: ~15 minutes from start to published release

---

## 🤖 Agent Guidance (Enforce This Order)

When automating releases, always follow this sequence and avoid duplicating logic:

1. **Primary orchestrator**: `RELEASE_WITH_DOCS.ps1`
   - Runs preparation, generates docs, commits, tags
2. **GitHub Release**: `RELEASE_HELPER.ps1 -Action CreateRelease -Tag <version>`
   - Publishes/updates the GitHub Release UI via gh CLI
3. **Never recreate** one-off scripts (e.g., `UPDATE_RELEASE.ps1` was removed)

Agents must use these two scripts instead of writing new release scripts. If a release already exists, `RELEASE_HELPER.ps1` will offer to update it automatically.

---

**See Also**:
- [Release Checklist Template](../releases/RELEASE_CHECKLIST_$11.15.2.md)
- [GitHub Release Template](../releases/GITHUB_RELEASE_$11.15.2.md)
- [Phase 2 Issues](../releases/GITHUB_ISSUES_PHASE2.md)
