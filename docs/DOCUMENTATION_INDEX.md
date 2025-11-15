# Documentation Index

**Last Updated**: 2025-11-15
**Version**: 1.6.3

This document serves as the single source of truth for all project documentation, eliminating confusion from duplicate or outdated files.

---

## 📚 Core Documentation (Current & Active)

### Getting Started

- **[README.md](../README.md)** - Main project documentation, features, quick start
- **[TODO.md](../TODO.md)** - Current task list and project roadmap (Updated 2025-01-10)
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes

### Installation & Deployment

- **[INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)** - Step-by-step installation for Windows/Mac/Linux
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Deployment verification checklist

### Performance & Optimization

- **[PERFORMANCE_OPTIMIZATIONS_2025-01-10.md](../PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)** - Latest performance improvements (NEW)
  - Database indexing (+40% query speed)
  - Response caching (+70% faster)
  - N+1 query fixes (100x reduction)
  - React optimization (+60-70% render speed)

---

## 📂 Specialized Documentation

### Development

- **[docs/QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Quick start for developers
- **[docs/ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[docs/AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication implementation guide
- **[docs/LOCALIZATION.md](LOCALIZATION.md)** - Internationalization (i18n) guide

### Operations

- **[docs/DOCKER_OPERATIONS.md](DOCKER_OPERATIONS.md)** - Docker commands and troubleshooting
- **[docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md](FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common deployment issues
- **[docs/DEPLOYMENT_ASSET_TRACKER.md](DEPLOYMENT_ASSET_TRACKER.md)** - Inventory of scripts, workflows, and runbooks required for release readiness


### Release Automation

- **[docs/releases/v1.6.3.md](releases/v1.6.3.md)** - Canonical release notes plus archive/cleanup checklist
- **[`scripts/ops/archive-releases.ps1`](../scripts/ops/archive-releases.ps1)** - CLI helper that archives all tags up to v1.6.2 (supports `-DryRun`, offline fixtures via `scripts/ops/samples/releases.sample.json`)
- **[`.github/workflows/archive-legacy-releases.yml`](../.github/workflows/archive-legacy-releases.yml)** - Manual Action wrapper around the archival script
- **[`scripts/ops/remove-legacy-packages.ps1`](../scripts/ops/remove-legacy-packages.ps1)** - GHCR cleanup helper (delete or privatize legacy images; offline fixture at `scripts/ops/samples/package-versions.sample.json`)


### Guides (Greek)

- **[ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](../ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Greek quick start guide
- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](../ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Greek user manual

---

## 📊 Documentation Health

### Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Active | 12 | Current, maintained documentation |

### Recent Updates (2025-11-15)

1. ✅ **Release finalized**: README, CHANGELOG, and `.env` all aligned to v1.6.3 with explicit guidance for archiving older assets.
2. 🗂️ **Archive surfaced**: Added instructions for packaging legacy setup/stop wrappers inside GitHub Releases and pointed operators to `archive/README.md`.
3. 📚 **Docs refreshed**: README, docs/SCRIPTS_GUIDE.md, and docs/releases notes now explain the v1.6.3 cut plus the new GitHub package retirement workflow.

### Previous Updates (2025-01-10)

1. ✅ **Created**: PERFORMANCE_OPTIMIZATIONS_2025-01-10.md
2. ✅ **Created**: DOCUMENTATION_CLEANUP_2025-01-10.md
3. ✅ **Updated**: TODO.md (comprehensive refresh)
4. ✅ **Created**: This documentation index
5. 🗑️ **Removed**: 9 deprecated/outdated documentation files

- DEPLOYMENT_READINESS_ANALYSIS.md
- REFACTORING_PLAN.md
- RELEASE_READINESS_v1.3.9.md
- DEPLOYMENT_DECISION_TREE.md
- docs/IMPROVEMENT_ROADMAP.md
- docs/V2_MODERNIZATION_ROADMAP.md
- docs/DATABASE_REFACTORING_ANALYSIS.md
- docs/RELEASE_NOTES_IMPORT_RESOLVER_SWEEP.md
- docs/DEPLOYMENT_MODE_DECISION.md

---

## 🧭 Navigation Guide

### I want to

**Install the application**
→ Start with [INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)

**Deploy to production**
→ Read [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
→ Use [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for verification

**Understand performance improvements**
→ Read [PERFORMANCE_OPTIMIZATIONS_2025-01-10.md](../PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)

**See what needs to be done**
→ Check [TODO.md](../TODO.md)

**Understand the architecture**
→ Read [docs/ARCHITECTURE.md](ARCHITECTURE.md)

**Troubleshoot Docker issues**
→ Check [docs/DOCKER_OPERATIONS.md](DOCKER_OPERATIONS.md)

**Implement authentication**
→ Follow [docs/AUTHENTICATION.md](AUTHENTICATION.md)

**Add translations**
→ Read [docs/LOCALIZATION.md](LOCALIZATION.md)

---

## 📝 Documentation Guidelines

### When to Create New Documentation

1. **New major feature** - Create dedicated guide in `docs/`
2. **Breaking changes** - Update CHANGELOG.md + affected guides
3. **Performance work** - Document in dedicated file with timestamp
4. **Security fixes** - Document in CHANGELOG.md (be careful about sensitive details)

### When to Update Existing Documentation

1. **Minor feature additions** - Update relevant guide
2. **Bug fixes** - Update CHANGELOG.md
3. **Configuration changes** - Update INSTALLATION_GUIDE.md or DEPLOYMENT_GUIDE.md
4. **Deprecations** - Mark old docs as deprecated in this index

### When to Remove Documentation

1. **Information is outdated** - Remove deprecated analysis/planning documents
2. **Content is superseded** - Remove and update references to replacement doc
3. **Analysis is completed** - Remove and document completion in CHANGELOG.md
4. **Keep version history in git** - Git history preserves removed files for reference

---

## 🔄 Maintenance Schedule

### Monthly (First week of month)

- [ ] Review TODO.md progress
- [ ] Update this documentation index
- [ ] Archive completed analyses
- [ ] Update CHANGELOG.md for new release

### Quarterly (Every 3 months)

- [ ] Comprehensive documentation audit
- [ ] Update outdated screenshots/examples
- [ ] Review and update ARCHITECTURE.md
- [ ] Verify all links are working

### Yearly

- [ ] Major documentation refactoring if needed
- [ ] Archive old versioned documentation
- [ ] Update technology stack references

---

## 📧 Documentation Feedback

Found incorrect, outdated, or missing documentation?

1. Check this index to see if newer docs exist
2. Create GitHub issue with label `documentation`
3. Include: Document name, issue description, suggested fix

---

**This index is maintained by**: Development Team
**Contact**: See README.md for contact information
**Last comprehensive audit**: 2025-01-10
