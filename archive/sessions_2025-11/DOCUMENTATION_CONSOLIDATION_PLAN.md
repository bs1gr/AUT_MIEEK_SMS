# Documentation Consolidation Plan - November 2025

## Overview

This plan consolidates recent improvements and ensures documentation follows the systematic structure defined in `docs/DOCUMENTATION_INDEX.md`.

## Current State Analysis

### Root Directory (To Clean Up)

#### Session/Temporal Documents (Move to Archive)
1. `COMPREHENSIVE_CLEANUP_2025-11-25.md` → `archive/sessions_2025-11/`
2. `GIT_COMMIT_2025-11-25.md` → `archive/sessions_2025-11/`
3. `AUTOSAVE_COMPLETE_SUMMARY.md` → `archive/sessions_2025-11/` (if not already)
4. `PRE_COMMIT_AUTOMATION_SUMMARY.md` → `archive/sessions_2025-11/`
5. `DESKTOP_TOGGLE_IMPLEMENTATION_SUMMARY.md` → `archive/sessions_2025-11/`
6. `TRY_DESKTOP_SHORTCUT.md` → `archive/sessions_2025-11/`

#### Reference Documents (Keep/Move to docs/)
1. `GIT_COMMIT_INSTRUCTIONS.md` → `docs/development/GIT_WORKFLOW.md` (consolidated)
2. `COMMIT_PREP_USAGE.md` → Merge into GIT_WORKFLOW.md
3. `DESKTOP_SHORTCUT_QUICK_START.md` → Keep (user-facing)
4. `TODO.md` → Keep (active project tracking)
5. `README.md` → Keep (main entry point)
6. `CHANGELOG.md` → Keep (version history)

### Documentation Structure Goals

```
Root (Essential Only - 8 files)
├── README.md                          ✅ Keep - Main entry point
├── CHANGELOG.md                       ✅ Keep - Version history  
├── TODO.md                            ✅ Keep - Active tracking
├── DESKTOP_SHORTCUT_QUICK_START.md   ✅ Keep - User feature guide
├── INSTALLATION_GUIDE.md              ✅ Keep - Primary install doc
├── DEPLOYMENT_GUIDE.md                ✅ Keep - Primary deploy doc
├── DEPLOYMENT_CHECKLIST.md            ✅ Keep - Deploy verification
└── SCRIPTS_CONSOLIDATION_GUIDE.md     ✅ Keep - v2.0 migration guide

docs/ (Organized by Role)
├── README.md                          ✅ Navigation hub
├── DOCUMENTATION_INDEX.md             ✅ Master index
├── user/                              ✅ End-user docs
├── development/                       ✅ Developer docs
├── deployment/                        ✅ DevOps docs
├── operations/                        ✅ Operational guides
├── reference/                         ✅ Quick references
├── releases/                          ✅ Release notes
└── qnap/                             ✅ QNAP-specific

archive/ (Historical)
├── sessions_2025-11/                  ✅ November sessions
├── deprecated/                        ✅ Deprecated scripts/docs
└── README.md                          ✅ Archive index
```

## Actions Required

### Phase 1: Archive Session Documents

Move temporal/session documents to archive:

```powershell
# Create archive directory if needed
New-Item -ItemType Directory -Force -Path "archive/sessions_2025-11"

# Move session documents
Move-Item "COMPREHENSIVE_CLEANUP_2025-11-25.md" "archive/sessions_2025-11/"
Move-Item "GIT_COMMIT_2025-11-25.md" "archive/sessions_2025-11/"
Move-Item "PRE_COMMIT_AUTOMATION_SUMMARY.md" "archive/sessions_2025-11/"
Move-Item "DESKTOP_TOGGLE_IMPLEMENTATION_SUMMARY.md" "archive/sessions_2025-11/"
Move-Item "TRY_DESKTOP_SHORTCUT.md" "archive/sessions_2025-11/"
```

### Phase 2: Consolidate Git Workflow Documentation

Create `docs/development/GIT_WORKFLOW.md` consolidating:
- `GIT_COMMIT_INSTRUCTIONS.md`
- `COMMIT_PREP_USAGE.md`
- Pre-commit automation info from `PRE_COMMIT_AUTOMATION_SUMMARY.md`

Then remove originals from root.

### Phase 3: Update Archive Index

Update `archive/sessions_2025-11/README.md` to include:
- Nov 25 cleanup session
- Nov 25 git commit prep
- Pre-commit automation summary
- Desktop toggle implementation
- Desktop shortcut trial

### Phase 4: Update Documentation Index

Update `docs/DOCUMENTATION_INDEX.md`:
- Remove references to archived documents
- Add reference to new `docs/development/GIT_WORKFLOW.md`
- Update file counts in "Documentation Health" section

### Phase 5: Verify Links

Check all documentation for broken links to moved files:
- Search for references to moved files
- Update links to point to archive or new locations
- Update copilot instructions if needed

## Implementation

### Files to Create

1. **`docs/development/GIT_WORKFLOW.md`** (NEW)
   - Consolidates git commit workflow
   - Includes pre-commit automation
   - Documents commit message standards
   - Explains commit prep script usage

2. **Update `archive/sessions_2025-11/README.md`**
   - Add November 25 session documents
   - Update file count
   - Add retrieval instructions

### Files to Move

| Source (Root) | Destination (Archive) | Reason |
|---------------|----------------------|--------|
| `COMPREHENSIVE_CLEANUP_2025-11-25.md` | `archive/sessions_2025-11/` | Session doc |
| `GIT_COMMIT_2025-11-25.md` | `archive/sessions_2025-11/` | Session doc |
| `PRE_COMMIT_AUTOMATION_SUMMARY.md` | `archive/sessions_2025-11/` | Session summary |
| `DESKTOP_TOGGLE_IMPLEMENTATION_SUMMARY.md` | `archive/sessions_2025-11/` | Feature summary |
| `TRY_DESKTOP_SHORTCUT.md` | `archive/sessions_2025-11/` | Trial/testing doc |

### Files to Remove

After consolidation into `docs/development/GIT_WORKFLOW.md`:
- `GIT_COMMIT_INSTRUCTIONS.md` (content moved)
- `COMMIT_PREP_USAGE.md` (content moved)

### Files to Keep in Root

Essential user-facing and project management files:
- `README.md` - Main entry point
- `CHANGELOG.md` - Version history
- `TODO.md` - Active project tracking
- `DESKTOP_SHORTCUT_QUICK_START.md` - User feature guide
- `INSTALLATION_GUIDE.md` - Primary install doc
- `DEPLOYMENT_GUIDE.md` - Primary deploy doc  
- `DEPLOYMENT_CHECKLIST.md` - Deploy verification
- `SCRIPTS_CONSOLIDATION_GUIDE.md` - v2.0 migration guide

## Expected Outcomes

### Before
- Root directory: 15+ markdown files
- Mixed purposes: active, session, historical
- Unclear what's current vs archived

### After
- Root directory: 8 essential markdown files
- Clear purpose: active user/project docs only
- Historical documents in `archive/sessions_2025-11/`
- Developer workflows in `docs/development/`

### Benefits

1. **Clearer Organization**
   - Essential docs in root
   - Historical docs in archive
   - Role-based docs in subdirectories

2. **Easier Navigation**
   - Users find what they need quickly
   - Less clutter in root directory
   - Clear documentation hierarchy

3. **Better Maintenance**
   - Know where to add new docs
   - Easy to find outdated content
   - Systematic archival process

## Verification Checklist

After implementation:

- [ ] Root directory has only 8 essential .md files
- [ ] All session documents moved to archive
- [ ] Archive README updated with new documents
- [ ] `docs/development/GIT_WORKFLOW.md` created
- [ ] Old git workflow docs removed from root
- [ ] `docs/DOCUMENTATION_INDEX.md` updated
- [ ] All internal links verified and working
- [ ] `.github/copilot-instructions.md` updated if needed
- [ ] No broken references in active documentation

## Maintenance Process

Going forward, for any new session/temporal document:

1. **During Work**: Create in root for easy access
2. **After Completion**: Move to `archive/sessions_YYYY-MM/`
3. **Monthly Cleanup**: Review root directory, archive as needed
4. **Update Indexes**: Keep documentation indexes current

## Notes

- This consolidation focuses on organization, not content changes
- All historical information is preserved in archive
- Active documentation remains accessible
- Follows established documentation structure from v1.9.0

---

**Status**: Ready for Implementation
**Created**: 2025-11-25
**Impact**: Low risk - organizational only
**Estimated Time**: 30 minutes
