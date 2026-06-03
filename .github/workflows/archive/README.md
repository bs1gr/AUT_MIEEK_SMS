# Archived Workflows

This directory contains deprecated workflows that have been superseded by more efficient implementations or consolidated into larger workflows.

## Why Workflows Are Archived

Archived workflows are **no longer active** in the repository's CI/CD pipeline. They may be referenced here for historical purposes or as documentation of previous approaches.

### Benefits of Archiving:
- ✅ Cleaner workflow directory (fewer files to maintain)
- ✅ Reduced confusion about which workflows are active
- ✅ Preserved Git history (archived files stay in Git, just not executed)
- ✅ Easy rollback (if needed, move files back to `.github/workflows/`)

---

## Archived Workflows

### 1. **deprecation-audit.yml**
- **Purpose:** Monthly audit for deprecated code markers
- **Status:** ✅ Archived (June 3, 2026)
- **Reason:** Rarely triggered, low operational value; can be run manually if needed
- **Replacement:** Manual on-demand via `workflow_dispatch` or integrate into pre-commit hooks
- **Trigger was:** Schedule (1st of month at 3 AM UTC), PR, manual dispatch

### 2. **doc-audit.yml**
- **Purpose:** Audit documentation freshness (max age 180 days)
- **Status:** ✅ Archived (June 3, 2026)
- **Reason:** Minimal usage, can be run locally during documentation reviews
- **Replacement:** Manual `./scripts/docs/audit-docs.ps1` as part of release checklist
- **Trigger was:** PR with docs changes, push to main with docs changes

### 3. **markdown-lint.yml**
- **Purpose:** Lint markdown files in docs/
- **Status:** ✅ Archived (June 3, 2026)
- **Reason:** Better served by pre-commit hooks for immediate feedback; nightly CI run adds minimal value
- **Replacement:** Pre-commit hook or IDE plugin (markdownlint-cli)
- **Trigger was:** PR, nightly schedule, manual dispatch

### 4. **version-consistency.yml**
- **Purpose:** Validate VERSION file matches across codebase
- **Status:** ✅ Archived (June 3, 2026)
- **Reason:** Functionality now embedded in `ci-cd-pipeline.yml` (version-verification job)
- **Replacement:** `ci-cd-pipeline.yml` → Phase 1: Version Verification
- **Trigger was:** Every push/PR to main

---

## How to Restore an Archived Workflow

If you need to restore a workflow (e.g., to re-enable nightly markdown linting):

```bash
# Move archived workflow back to active directory
mv .github/workflows/archive/markdown-lint.yml .github/workflows/markdown-lint.yml

# Commit the change
git add .github/workflows/
git commit -m "chore(ci): restore markdown-lint workflow"
git push
```

---

## Integration Options for Archived Workflows

### **Option A: Pre-Commit Hooks** (Recommended for local checks)
Move linting logic to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Run markdown linting before commit
markdownlint "docs/**/*.md" || exit 1
```

### **Option B: Manual Dispatch**
Keep workflow file archived but re-enable on-demand:
```bash
mv .github/workflows/archive/deprecation-audit.yml .github/workflows/
# Now available via GitHub UI: Actions → Deprecation Policy Audit → Run workflow
```

### **Option C: Scheduled Maintenance Workflow**
Consolidate multiple archived workflows into `.github/workflows/maintenance.yml`:
```yaml
# See: docs/cicd-improvements-examples.md for implementation
```

---

## Decision Log

| Workflow | Date Archived | Reason | Owner Decision |
|----------|---------------|--------|-----------------|
| deprecation-audit.yml | 2026-06-03 | Low operational value, moved to manual/pre-commit | @reviewer |
| doc-audit.yml | 2026-06-03 | Minimal CI value, better as release checklist task | @reviewer |
| markdown-lint.yml | 2026-06-03 | Pre-commit hook preferred for faster feedback | @reviewer |
| version-consistency.yml | 2026-06-03 | Logic consolidated into ci-cd-pipeline.yml | @reviewer |

---

## Related Documents

- **Main Review:** [`docs/cicd-review-report.md`](../../docs/cicd-review-report.md)
- **Implementation Guide:** [`docs/cicd-improvements-examples.md`](../../docs/cicd-improvements-examples.md)
- **Workflow Structure:** [`.github/WORKFLOW_STRUCTURE.md`](../WORKFLOW_STRUCTURE.md)

---

## Questions?

If you're unsure whether a workflow should be archived or restored, check:

1. **Is it triggered automatically?** → Check GitHub Actions runs (Actions tab)
2. **Is it recent?** → Check git log for last modification
3. **Is it documented?** → Check `ci-cd-pipeline.yml` for consolidation notes

For CI/CD architecture questions, see: `docs/cicd-review-report.md` (Section 1: Workflow Consolidation)

---

**Last Updated:** June 3, 2026  
**Status:** All workflows in this directory are superseded or moved to pre-commit hooks.
