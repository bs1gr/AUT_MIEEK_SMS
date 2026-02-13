# Deprecation Policy

**Version**: 1.0
**Effective Date**: February 13, 2026
**Owner**: Development Team
**Review Cycle**: Quarterly

---

## 📜 Purpose

This policy establishes clear guidelines for:
- Identifying deprecated code, scripts, and documentation
- Communicating deprecation to users
- Managing sunset periods
- Archiving obsolete files
- Preventing reintroduction of deprecated content

---

## 🎯 Scope

This policy applies to:
- PowerShell scripts (automation, deployment, release)
- Python backend code (APIs, services, utilities)
- Frontend code (components, hooks, utilities)
- Documentation (guides, references, how-tos)
- Configuration files (templates, samples)
- Database migrations (when applicable)

---

## 📊 Deprecation Lifecycle

### Stage 1: Identification (0-7 days)

**Criteria for deprecation**:
- Functionality consolidated into another file
- Replaced by newer implementation
- No longer compatible with current architecture
- Security or performance concerns
- Duplicate or redundant functionality

**Actions**:
1. Document reason for deprecation
2. Identify replacement (if applicable)
3. Assess impact (who uses it, how critical)
4. Create migration path

### Stage 2: Announcement (7-14 days)

**Communication channels**:
- Add deprecation notice to file header
- Update relevant documentation
- Create migration guide (if complex)
- Add entry to `CHANGELOG.md`
- Update `DOCUMENTATION_INDEX.md` (for docs)

**Deprecation Notice Template** (Scripts):
```powershell
<#
.SYNOPSIS
    ⛔ DEPRECATED as of [DATE]

.DESCRIPTION
    This script has been deprecated and will be archived on [SUNSET_DATE].
    Use [REPLACEMENT] instead.

.NOTES
    Deprecation Reason: [REASON]
    Replacement: [REPLACEMENT_FILE]
    Migration Guide: [LINK_TO_GUIDE]
    Archive Date: [SUNSET_DATE]
#>
```

**Deprecation Notice Template** (Documentation):
```markdown
> **⛔ DEPRECATED**: This document was deprecated on [DATE].
>
> **Reason**: [REASON]
> **Replacement**: [REPLACEMENT_DOC](link)
> **Migration**: See [MIGRATION_GUIDE](link)
```

### Stage 3: Sunset Period (14-30 days minimum)

**Required duration**:
- **Scripts**: 30 days minimum
- **Documentation**: 14 days minimum
- **Core APIs**: 60 days minimum (breaking changes)
- **Utilities**: 14 days minimum

**During sunset**:
- Deprecation warnings in place
- Replacement verified working
- Migration guide available
- Users notified via changelog

**Exceptions**:
- **Emergency deprecation**: Security vulnerabilities (immediate sunset)
- **Dead code**: No active usage detected (14 days minimum)
- **Duplicate consolidation**: Clear replacement exists (14 days)

### Stage 4: Archival (After sunset)

**Archival checklist**:
1. ✅ Sunset period elapsed
2. ✅ Replacement verified working
3. ✅ Migration guide published
4. ✅ No active usage detected
5. ✅ Documentation updated
6. ✅ `.gitignore` updated (if needed)

**Archival process**:
```powershell
# 1. Move file to archive with dated subdirectory
Move-Item "FILE.ps1" "archive\cleanup-$(Get-Date -Format 'MMM-yyyy')\legacy-scripts\FILE.ps1"

# 2. Update references in codebase
# Replace invocations with deprecation notice or remove

# 3. Update .gitignore to prevent readdition
# Add pattern if entire category archived

# 4. Commit with clear message
git add .
git commit -m "chore(deprecation): archive FILE.ps1 (deprecated DATE, replaced by REPLACEMENT.ps1)"
```

**Archive structure**:
```
archive/
├── cleanup-[month]-[year]/
│   ├── legacy-scripts/       # Deprecated scripts
│   ├── legacy-docs/          # Obsolete documentation
│   ├── legacy-reports/       # Historical analysis
│   └── README.md             # Archive index
└── README.md                 # Archive discovery guide
```

### Stage 5: Permanent Removal (Optional, 1+ year)

**Criteria for permanent removal**:
- File archived > 1 year
- No restoration requests
- No historical value
- Space optimization needed

**Approval required**: Project owner sign-off only

---

## 🏷️ Deprecation Markers

### Consistent Naming

Use these **exact prefixes** for deprecated entities:

- **Scripts**: Filename unchanged, header updated with deprecation notice
- **Functions**: `@deprecated` JSDoc tag (Python/JavaScript)
- **Documentation**: Strike-through title with (DEPRECATED) suffix
- **Directories**: `legacy-` prefix when archiving category

### Code Annotations

**Python**:
```python
def old_function():
    """
    .. deprecated:: 1.15.0
        Use :func:`new_function` instead.
        This will be removed in version 2.0.0.
    """
    import warnings
    warnings.warn("old_function is deprecated, use new_function", DeprecationWarning)
    # ... implementation
```

**JavaScript/TypeScript**:
```typescript
/**
 * @deprecated Since version 1.15.0. Use newFunction() instead.
 * Will be removed in version 2.0.0.
 */
function oldFunction() {
  console.warn('oldFunction is deprecated, use newFunction');
  // ... implementation
}
```

### Documentation Formatting

**Markdown Headers**:
```markdown
## ~~Section Title~~ (DEPRECATED)

**⛔ DEPRECATED**: Date, reason, replacement
```

**Table Entries**:
```markdown
| ~~DEPRECATED_SCRIPT.ps1~~ | ⛔ Deprecated | [Migration](link) |
```

---

## 🚨 Emergency Deprecation

When **immediate archival** is required (security, critical bugs):

1. **Document urgency** in deprecation notice
2. **Archive immediately** (no sunset period)
3. **Create urgent migration guide**
4. **Notify users** via changelog and relevant docs
5. **Provide rollback path** if possible

**Emergency template**:
```markdown
> **⛔⛔⛔ URGENT DEPRECATION**: This [file/feature] was immediately deprecated on [DATE].
>
> **Reason**: [CRITICAL_SECURITY_ISSUE or BREAKING_BUG]
> **Action Required**: Migrate immediately to [REPLACEMENT]
> **Migration**: [URGENT_GUIDE_LINK]
> **Rollback**: [ROLLBACK_INSTRUCTIONS if available]
```

---

## 📝 Migration Guides

### Required Elements

Every deprecation **must** include:

1. **What changed**: Clear explanation of deprecation
2. **Why it changed**: Rationale and benefits
3. **Migration path**: Step-by-step replacement instructions
4. **Command equivalents**: Old vs new syntax side-by-side
5. **Testing verification**: How to confirm migration success
6. **Support contacts**: Where to get help

### Template Structure

See `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md` for reference:
- Deprecation notice (status, dates, reason)
- Migration guide (old → new workflow)
- Command equivalents table
- What changed (feature mapping)
- FAQ section

---

## 🔍 Automated Enforcement

### CI/CD Checks

**Pre-commit hooks**:
- Warn if adding back archived file patterns
- Check for undocumented deprecations
- Verify migration guides exist for deprecations

**GitHub Actions** (TODO):
- Monthly deprecated marker audit
- Archive age verification
- Documentation consistency checks

### .gitignore Patterns

After archiving entire categories, add patterns:
```gitignore
# Deprecated scripts archived Feb 2026
/RELEASE_PREPARATION.ps1

# Legacy test result formats (archived)
/test_results_*.txt
```

### Workspace Validation

Use `WORKSPACE_CLEANUP.ps1` to verify:
- No deprecated files in root
- Archive structure consistent
- Migration guides linked properly

---

## 📊 Monitoring & Reporting

### Quarterly Review

- [ ] Audit all deprecation markers
- [ ] Verify sunset periods honored
- [ ] Check for orphaned references
- [ ] Update archive README.md
- [ ] Report archival statistics

### Metrics to Track

- **Active deprecations**: Files in sunset period
- **Archival rate**: Files per month
- **Restoration requests**: How often archived files restored
- **Migration success**: User adoption of replacements

---

## 🔗 Related Policies

- **Versioning Policy**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Release Policy**: `docs/development/GIT_WORKFLOW.md`
- **Testing Policy**: `docs/AGENT_POLICY_ENFORCEMENT.md` Policy 1
- **Documentation Policy**: `docs/DOCUMENTATION_INDEX.md`

---

## 📚 Examples

### Example 1: Script Deprecation (RELEASE_PREPARATION.ps1)

**Timeline**:
- **Jan 6, 2026**: Functionality consolidated into `RELEASE_READY.ps1`
- **Feb 4, 2026**: Deprecation notice added to script header
- **Feb 13, 2026**: Sunset period complete (40 days), script archived
- **Migration guide**: `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md`
- **Archive location**: `archive/cleanup-feb2026/legacy-scripts/RELEASE_PREPARATION.ps1`

**Results**:
- 50+ references updated across documentation
- Replacement verified working (100% test pass rate)
- Zero restoration requests

### Example 2: Documentation Consolidation

**Scenario**: 3 pre-commit guides consolidated into one

**Timeline**:
- **Dec 6, 2025**: `PRE_COMMIT_GUIDE.md` created as consolidated replacement
- **Dec 6, 2025**: Deprecation notices added to old guides
- **Dec 20, 2025**: Old guides archived to `archive/pre-commit-2025-12-06/`

**Files affected**:
- `PRE_COMMIT_AUTOMATION.md` → archived
- `PRECOMMIT_INSTRUCTIONS.md` → archived
- `pre-commit-workflow.md` → archived

---

## ❓ FAQ

**Q: Can I skip the sunset period?**
A: Only for emergency security issues or dead code with zero usage.

**Q: What if users still need the deprecated file?**
A: Extend sunset period or reconsider deprecation. Restoration from archive is possible.

**Q: How do I search for all deprecations?**
A: `grep -r "DEPRECATED" docs/ scripts/ backend/ frontend/`

**Q: What if I accidentally commit archived content?**
A: Update `.gitignore` to prevent readdition. Pre-commit hooks should catch this.

**Q: Can deprecated files be restored?**
A: Yes, but requires justification and migration guide update. See `archive/README.md`.

---

**Last Updated**: February 13, 2026
**Next Review**: May 13, 2026 (quarterly)
**Policy Owner**: Development Team
