# Archive Directory

**Purpose**: Historical preservation of deprecated, superseded, or obsolete files
**Last Updated**: February 13, 2026
**Total Items**: 3,816 files and directories

---

## 📁 Directory Structure

### Top-Level Subdirectories

| Directory | Purpose | Date Range | Items |
|-----------|---------|------------|-------|
| `cleanup-feb2026/` | February 2026 cleanup initiative | Feb 2026 | Scripts, backups, reports, tests, lint |
| `sessions/` | Historical session documents | Nov 2025 - Jan 2026 | Session reports, analysis |
| `phase4-session-jan26/` | Phase 4 work session artifacts | Jan 2026 | Phase 4 planning |
| `displaced-files-jan2026/` | Relocated files from reorganization | Jan 2026 | Misc files |
| `db_py_deprecated_20260130_223127.py` | Single deprecated module | Jan 30, 2026 | 1 file |

---

## 🗂️ Cleanup February 2026 Structure

The `cleanup-feb2026/` subdirectory contains files archived during the February 2026 workspace cleanup initiative:

```
cleanup-feb2026/
├── legacy-scripts/          # Deprecated PowerShell scripts (RELEASE_PREPARATION.ps1, etc.)
├── legacy-backups/          # Old backup files (pre-retention policy)
├── legacy-reports/          # Outdated analysis and audit reports
├── legacy-test-results/     # Historical test output logs
└── legacy-lint/             # Old linting and markdown audit results
```

### Key Archived Scripts

- **RELEASE_PREPARATION.ps1** (447 lines)
  - Deprecated: Feb 4, 2026
  - Replaced by: `RELEASE_READY.ps1`
  - Archive path: `cleanup-feb2026/legacy-scripts/RELEASE_PREPARATION.ps1`
  - Migration guide: See `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md`

---

## 📜 Retention Policy

### What Gets Archived

Files are archived when they are:
1. **Deprecated**: Replaced by newer implementations
2. **Superseded**: Functionality consolidated into other files
3. **Obsolete**: No longer relevant to current development
4. **Historical**: Session-specific documentation after completion
5. **Cleanup**: Bulk reorganization artifacts

### Archive Criteria

- **Scripts**: Deprecated > 14 days and replacement verified working
- **Documentation**: Superseded > 30 days and replacement documented
- **Reports**: Completed analysis > 90 days
- **Backups**: Older than retention window (typically 30-90 days)
- **Test Results**: Historical runs > 30 days (unless investigation active)

### What Does NOT Get Archived

- **Active development files**: Current work in progress
- **Reference documentation**: Still-valid guides and policies
- **Recent backups**: Within retention window
- **Operational scripts**: Still in use by automation
- **Critical analysis**: Ongoing investigations or pending decisions

---

## 🔍 Discovery & Navigation

### Finding Archived Content

**By Date**:
```powershell
# Files archived in February 2026
Get-ChildItem archive\cleanup-feb2026\ -Recurse

# Session documents from specific month
Get-ChildItem archive\sessions\ -Filter "*2026-01-*"
```

**By Type**:
```powershell
# All archived scripts
Get-ChildItem archive\ -Recurse -Filter "*.ps1"

# All archived documentation
Get-ChildItem archive\ -Recurse -Filter "*.md"

# All archived test results
Get-ChildItem archive\cleanup-feb2026\legacy-test-results\
```

**By Content**:
```powershell
# Search all archive content for keyword
Get-ChildItem archive\ -Recurse -Filter "*.md" | Select-String "VERSION"

# Find specific file name
Get-ChildItem archive\ -Recurse -Filter "*RELEASE_PREPARATION*"
```

### Restoration Process

If you need to restore archived content:

1. **Verify necessity**: Confirm the archived file is still needed
2. **Check for replacement**: Ensure newer version doesn't exist
3. **Copy, don't move**: Always copy from archive to avoid data loss
4. **Update references**: Fix any broken links or imports
5. **Document restoration**: Note why file was restored

```powershell
# Example restoration command
Copy-Item "archive\cleanup-feb2026\legacy-scripts\OLD_SCRIPT.ps1" -Destination "scripts\" -Force
```

---

## 📊 Archive Statistics

### By Category (Feb 13, 2026)

| Category | Count | Oldest | Newest |
|----------|-------|--------|--------|
| Scripts (.ps1) | ~50 | Nov 2025 | Feb 2026 |
| Documentation (.md) | ~200 | Nov 2025 | Feb 2026 |
| Test Results (.txt/.log) | ~100 | Dec 2025 | Feb 2026 |
| Backups (.db/.zip) | ~30 | Jan 2026 | Feb 2026 |
| Reports (analysis) | ~50 | Nov 2025 | Jan 2026 |
| Miscellaneous | ~50 | Nov 2025 | Feb 2026 |

### Space Utilization

- **Total Archive Size**: ~150 MB (estimated)
- **Largest Subdirectory**: `cleanup-feb2026/legacy-backups/` (~80 MB)
- **Growth Rate**: ~20-30 MB/month (typical)

---

## 🧹 Maintenance Guidelines

### Monthly Review

- [ ] Check for files older than retention policy
- [ ] Compress large archive subdirectories
- [ ] Update this README with new categories
- [ ] Verify no active development files in archive

### Quarterly Cleanup

- [ ] Remove files beyond extended retention (>1 year)
- [ ] Audit archive size and optimize storage
- [ ] Document any significant archive additions
- [ ] Review restoration requests and patterns

### Annual Audit

- [ ] Deep archive old sessions (>2 years)
- [ ] Comprehensive space optimization
- [ ] Update retention policy if needed
- [ ] Archive structure reorganization if warranted

---

## 📚 Related Documentation

- **Deprecation Policy**: `docs/development/DEPRECATION_POLICY.md` (to be created)
- **Workspace Cleanup**: `WORKSPACE_CLEANUP.ps1`
- **Release Scripts**: `docs/processes/RELEASE_SCRIPTS_OVERVIEW.md`
- **Audit Report**: `artifacts/DEPRECATED_FILES_AUDIT_2026-02-13.md`
- **Migration Guides**: `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md`

---

## ⚠️ Important Notes

1. **Do not delete archive content** without explicit backup verification
2. **Always document** why archived content is restored
3. **Check replacement availability** before restoring deprecated files
4. **Update references** if restoring requires codebase changes
5. **Archive is append-only** - prefer adding to archive over removing from active codebase

---

**Questions or Issues?**
- Check `artifacts/DEPRECATED_FILES_AUDIT_2026-02-13.md` for archival decisions
- See `docs/development/DEPRECATION_POLICY.md` for process guidelines
- Consult git history for file removal rationale: `git log --follow -- path/to/file`

---

**Last Comprehensive Audit**: February 13, 2026
**Next Scheduled Review**: March 13, 2026
