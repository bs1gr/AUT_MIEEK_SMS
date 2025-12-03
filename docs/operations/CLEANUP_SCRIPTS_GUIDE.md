# Cleanup Scripts Guide

**Last Updated**: 2025-11-28
**Repository Version**: 1.9.3
**Purpose**: Comprehensive guide to all cleanup operations and maintenance scripts

---

## 📊 Current Cleanup Scripts Inventory

### Active Scripts (In Use)

| Script Location | Lines | Purpose | Scope | Interactive |
|----------------|-------|---------|-------|-------------|
| **COMMIT_READY.ps1** | 843 | Pre-commit validation + cleanup | Python cache, Node cache, Build artifacts, Temp files | No (automated) |
| **DOCKER.ps1** | ~500 | Docker deployment + cleanup | Docker resources (images, containers, volumes, cache) | Yes (-DeepClean) |
| **scripts/dev/internal/CLEANUP_COMPREHENSIVE.ps1** | 303 | Comprehensive cleanup | All below + obsolete files + docs | Optional (-Docs, -Obsolete) |
| **scripts/dev/internal/CLEANUP_OBSOLETE_FILES.ps1** | 113 | Remove specific obsolete docs | Named obsolete markdown files | Yes (confirmation) |
| **scripts/dev/internal/CLEANUP_DOCS.ps1** | 1 | Remove non-essential docs | All .md except README files | (Empty file) |
| **.github/scripts/cleanup_artifacts.ps1** | 20 | CI artifacts cleanup | artifacts_run_*, run*.log files | No (automated) |

### Archived Scripts (Reference Only)

| Script Location | Status |
|----------------|--------|
| archive/pre-$11.9.7/deprecated/scripts_consolidation_2025-11-21/DEEP_DOCKER_CLEANUP.ps1 | ✅ Archived (functionality in DOCKER.ps1 -DeepClean) |
| archive/pre-$11.9.7/deprecated/scripts_consolidation_2025-11-21/SUPER_CLEAN_AND_DEPLOY.ps1 | ✅ Archived (split into DOCKER.ps1 + COMMIT_READY.ps1) |
| archive/pre-$11.9.7/deprecated/scripts_consolidation_2025-11-21/scripts/CLEANUP_TEMP.ps1 | ✅ Archived (functionality in CLEANUP_COMPREHENSIVE.ps1) |

---

## 🔍 Detailed Feature Comparison

### 1. COMMIT_READY.ps1 (Phase 4: Automated Cleanup)

**Scope**: Part of pre-commit validation workflow

#### What It Cleans:
```powershell
✅ Python cache (__pycache__/, *.pyc, *.pyo, .pytest_cache/)
✅ Node.js cache (node_modules/.cache/)
✅ Build artifacts (frontend/dist/, frontend/build/)
✅ Temporary files (*.tmp, *.temp, *.bak, *.backup, *.old)
```

**Features**:
- Automatic (no confirmation)
- Reports size freed (MB)
- Tracks results
- Safe (only removes generated files)

**When to Use**: Run as part of `.\COMMIT_READY.ps1`

---

### 2. DOCKER.ps1 (-Prune | -DeepClean)

**Scope**: Docker-specific cleanup operations

#### -Prune (Safe Cleanup):
```powershell
✅ Dangling Docker images
✅ Stopped containers
✅ Unused networks
❌ Keeps: Volumes, Active images, Running containers
```

#### -DeepClean (Nuclear Option):
```powershell
✅ ALL Docker images (sms*)
✅ ALL Docker containers (sms*)
✅ ALL Docker volumes (sms_data, etc.)
✅ Docker build cache
⚠️  WARNING: Requires full rebuild
```

**Features**:
- `-Prune`: Safe, can run anytime
- `-DeepClean`: Requires confirmation
- Reports space freed
- Docker-aware (checks if Docker is running)

**When to Use**:
- `-Prune`: Weekly or when low on disk space
- `-DeepClean`: Only when troubleshooting issues

---

### 3. CLEANUP_COMPREHENSIVE.ps1 (Most Feature-Rich)

**Scope**: Everything (Files + Docker)

#### What It Cleans (14 Phases):

**Files & Directories**:
```powershell
✅ [1] Obsolete LanguageToggle component
✅ [2] Entire Obsolete/ folder
✅ [3] Old HTML control panels
✅ [4] Old sms/ subfolder (duplicate structure)
✅ [5] Backup files (*.backup)
✅ [6] Duplicate pytest.ini
✅ [7] Old backup directories (keeps 2 most recent)
✅ [8] __pycache__ directories
✅ [9] .pytest_cache directories
✅ [10] Node/Vite cache (node_modules/.cache/, .vite/)
```

**Docker (Read-Only Analysis)**:
```powershell
○ [11] QNAP docker-compose.yml (asks before removing)
○ [12] Docker images/cache (reports, doesn't remove)
○ [13] Docker volumes (reports, doesn't remove)
○ [14] Dockerfile variants (reports only)
```

**Optional Modes**:
```powershell
-Docs     : Remove all .md files except READMEs
-Obsolete : Remove specific named obsolete files
```

**Features**:
- Most comprehensive
- Safe removal function with error handling
- Size tracking
- Detailed reporting
- Interactive for dangerous operations

**When to Use**: Monthly maintenance or major cleanup

---

### 4. CLEANUP_OBSOLETE_FILES.ps1

**Scope**: Specific named obsolete markdown files

#### What It Removes (16 files):
```
VERSIONING_GUIDE.md
TEACHING_SCHEDULE_GUIDE.md
RUST_BUILDTOOLS_UPDATE.md
QUICK_REFERENCE.md
PACKAGE_VERSION_FIX.md
ORGANIZATION_SUMMARY.md
NODE_VERSION_UPDATE.md
INSTALL_GUIDE.md
IMPLEMENTATION_REPORT.md
HELP_DOCUMENTATION_COMPLETE.md
FRONTEND_TROUBLESHOOTING.md
DEPLOYMENT_QUICK_START.md
DEPENDENCY_UPDATE_LOG.md
DAILY_PERFORMANCE_GUIDE.md
COMPLETE_UPDATE_SUMMARY.md
CODE_IMPROVEMENTS.md
```

**Features**:
- Targeted removal
- Requires confirmation
- Safe (preserves essential docs)

**When to Use**: When you have these specific files

---

### 5. CLEANUP_DOCS.ps1

**Status**: ⚠️ **Empty file** (1 line only)

**Expected Functionality** (based on CLEANUP_COMPREHENSIVE.ps1):
- Remove all .md files except READMEs
- **Current State**: Does nothing

**Recommendation**: Delete or implement

---

### 6. .github/scripts/cleanup_artifacts.ps1

**Scope**: CI-specific artifacts

#### What It Removes:
```
artifacts_run_*   (directories)
run*.log          (files)
run_*.log         (files)
```

**Features**:
- Git status aware
- Automatic (no confirmation)
- CI-focused

**When to Use**: Run by CI after workflow completion

---

## 📈 Overlap Analysis

### What Multiple Scripts Do

| Feature | COMMIT_READY | DOCKER | CLEANUP_COMPREHENSIVE | CLEANUP_OBSOLETE | cleanup_artifacts |
|---------|--------------|--------|----------------------|------------------|-------------------|
| Python cache | ✅ | ❌ | ✅ | ❌ | ❌ |
| Node cache | ✅ | ❌ | ✅ | ❌ | ❌ |
| Build artifacts | ✅ | ❌ | ✅ | ❌ | ❌ |
| Temp files (*.tmp, etc.) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Docker images | ❌ | ✅ | ○ (reports) | ❌ | ❌ |
| Docker volumes | ❌ | ✅ | ○ (reports) | ❌ | ❌ |
| Obsolete files | ❌ | ❌ | ✅ (with -Obsolete) | ✅ | ❌ |
| Old backups | ❌ | ❌ | ✅ | ❌ | ❌ |
| CI artifacts | ❌ | ❌ | ❌ | ❌ | ✅ |

**Key Findings**:
- ✅ **COMMIT_READY** and **CLEANUP_COMPREHENSIVE** have 50% overlap
- ✅ **DOCKER.ps1** has unique Docker capabilities
- ✅ **CLEANUP_COMPREHENSIVE** is most feature-rich but underutilized
- ⚠️  **CLEANUP_DOCS.ps1** is non-functional

---

## 🎯 Consolidation Recommendations

### Strategy: Keep Specialized, Remove Duplicates

#### Tier 1: Primary Scripts (Keep As-Is)

1. **COMMIT_READY.ps1** ⭐
   - Purpose: Pre-commit workflow automation
   - Keep because: Part of git workflow
   - Scope: Fast, safe cleanup only

2. **DOCKER.ps1** ⭐
   - Purpose: Docker operations
   - Keep because: Production deployment tool
   - Scope: Docker resources only

3. **.github/scripts/cleanup_artifacts.ps1** ⭐
   - Purpose: CI automation
   - Keep because: CI-specific
   - Scope: CI artifacts only

#### Tier 2: Specialized Scripts (Enhance & Keep)

4. **CLEANUP_COMPREHENSIVE.ps1** ⭐⭐⭐
   - **RECOMMEND**: Promote to primary maintenance script
   - **Action**: Update README and docs to reference it
   - **Usage**: Monthly maintenance, major cleanups
   - **Keep because**: Most comprehensive, well-structured

#### Tier 3: Redundant Scripts (Consolidate or Remove)

5. **CLEANUP_OBSOLETE_FILES.ps1**
   - **RECOMMEND**: Merge into CLEANUP_COMPREHENSIVE.ps1 (already there with `-Obsolete` flag)
   - **Action**: Add note to file header: "Use CLEANUP_COMPREHENSIVE.ps1 -Obsolete instead"
   - **Alternative**: Delete (functionality exists in CLEANUP_COMPREHENSIVE)

6. **CLEANUP_DOCS.ps1**
   - **RECOMMEND**: Delete or implement
   - **Status**: Currently empty (1 line)
   - **Action**: Either implement or remove file

---

## 💡 Proposed Consolidated Structure

### Recommended Script Organization

```powershell
# === PRIMARY ENTRY POINTS ===

# 1. Daily/Commit Cleanup (automatic, safe)
.\COMMIT_READY.ps1                    # Pre-commit validation + cleanup

# 2. Docker Cleanup (production)
.\DOCKER.ps1 -Prune                   # Safe Docker cleanup
.\DOCKER.ps1 -DeepClean               # Nuclear Docker cleanup

# === MAINTENANCE SCRIPTS ===

# 3. Comprehensive Maintenance (monthly)
.\scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1

# Optional modes:
.\scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1 -Docs      # + Remove non-essential docs
.\scripts\dev\internal\CLEANUP_COMPREHENSIVE.ps1 -Obsolete  # + Remove specific obsolete files

# === CI AUTOMATION ===

# 4. CI Artifacts (automatic)
.\.github\scripts\cleanup_artifacts.ps1
```

---

## 📝 Action Items for Consolidation

### High Priority

1. **✅ Update REPOSITORY_AUDIT_SUMMARY.md**
   - Add CLEANUP_COMPREHENSIVE.ps1 as primary maintenance script
   - Update "Available Cleanup Scripts" section
   - Add usage examples

2. **✅ Update README.md**
   - Maintenance section should mention CLEANUP_COMPREHENSIVE.ps1
   - Add to "Maintenance" section with examples

3. **❌ CLEANUP_OBSOLETE_FILES.ps1**
   - Option A: Add deprecation notice header
   - Option B: Delete file (functionality in CLEANUP_COMPREHENSIVE -Obsolete)
   - **Recommendation**: Option A (soft deprecation)

4. **❌ CLEANUP_DOCS.ps1**
   - Option A: Implement functionality
   - Option B: Delete empty file
   - **Recommendation**: Option B (delete)

### Medium Priority

5. **📝 Create CLEANUP_GUIDE.md**
   - Comprehensive guide to all cleanup operations
   - Decision tree: "When to use which script"
   - Examples for common scenarios

6. **🔄 Update COMMIT_READY.ps1**
   - Add reference to CLEANUP_COMPREHENSIVE.ps1 in help text
   - For deeper cleanup, suggest running CLEANUP_COMPREHENSIVE.ps1

### Low Priority

7. **📊 Add cleanup metrics tracking**
   - Track cleanup history
   - Report trends over time

---

## 🎭 Usage Decision Tree

```
Do you need cleanup?
│
├─ Before commit? → COMMIT_READY.ps1
│
├─ Docker issues? → DOCKER.ps1 -Prune (or -DeepClean)
│
├─ Monthly maintenance? → CLEANUP_COMPREHENSIVE.ps1
│
├─ Specific obsolete files? → CLEANUP_COMPREHENSIVE.ps1 -Obsolete
│
├─ Remove docs? → CLEANUP_COMPREHENSIVE.ps1 -Docs
│
└─ CI artifacts? → .github/scripts/cleanup_artifacts.ps1 (automatic)
```

---

## 📊 Space Savings Potential

Based on typical project state:

| Script | Typical Space Saved | Frequency |
|--------|-------------------|-----------|
| COMMIT_READY.ps1 | 10-50 MB | Daily |
| DOCKER.ps1 -Prune | 100-500 MB | Weekly |
| DOCKER.ps1 -DeepClean | 1-5 GB | Rarely |
| CLEANUP_COMPREHENSIVE.ps1 | 50-200 MB | Monthly |

**Total potential savings**: 1-6 GB (varies by usage)

---

## ✅ Summary & Next Steps

### Current State
- ✅ 6 cleanup scripts total
- ✅ 3 are archived (correctly)
- ✅ 3 are active and functional
- ⚠️  2 could be consolidated
- ⚠️  1 is empty (CLEANUP_DOCS.ps1)

### Recommended Actions

**Immediate** (Today):
1. Update REPOSITORY_AUDIT_SUMMARY.md with CLEANUP_COMPREHENSIVE.ps1
2. Add deprecation notice to CLEANUP_OBSOLETE_FILES.ps1
3. Delete CLEANUP_DOCS.ps1 (empty file)

**Short-term** (This Week):
4. Create CLEANUP_GUIDE.md with decision tree
5. Update README.md maintenance section

**Optional** (Future):
6. Add cleanup metrics tracking
7. Consider consolidating CLEANUP_OBSOLETE_FILES.ps1 into CLEANUP_COMPREHENSIVE.ps1

---

## 🎯 Final Recommendation

**Keep these 4 scripts**:
1. ✅ COMMIT_READY.ps1 - Pre-commit automation
2. ✅ DOCKER.ps1 - Docker operations
3. ✅ CLEANUP_COMPREHENSIVE.ps1 - Maintenance ⭐ **PROMOTE THIS**
4. ✅ .github/scripts/cleanup_artifacts.ps1 - CI automation

**Soft deprecate**:
5. ⚠️  CLEANUP_OBSOLETE_FILES.ps1 → Use CLEANUP_COMPREHENSIVE -Obsolete

**Delete**:
6. ❌ CLEANUP_DOCS.ps1 → Empty file

**Result**: 4 active, focused scripts with clear use cases and no significant overlap.

---

**Last Updated**: 2025-11-28
**Maintainer**: Development Team
**Status**: Consolidated from CLEANUP_SCRIPTS_ANALYSIS.md

