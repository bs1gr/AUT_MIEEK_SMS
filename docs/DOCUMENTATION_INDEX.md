# Documentation Index

**Last Updated**: 2025-11-18
**Version**: 1.7.0

This document serves as the single source of truth for all project documentation, eliminating confusion from duplicate or outdated files.

---

## 🗂️ Documentation Structure

Documentation is organized into three main directories:

- **[user/](user/)** - User guides, quick starts, and how-tos → [INDEX](user/INDEX.md)
- **[development/](development/)** - Technical docs, architecture, APIs → [INDEX](development/INDEX.md)
- **[deployment/](deployment/)** - Operations, deployment, troubleshooting → [INDEX](deployment/INDEX.md)

---

## 📚 Core Documentation (Current & Active)

### Getting Started

- **[README.md](../README.md)** - Main project documentation, features, quick start
- **[TODO.md](../TODO.md)** - Current task list and project roadmap
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes (Updated 2025-11-18)
- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - Quick start for new users

### Installation & Deployment

- **[INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)** - Step-by-step installation for Windows/Mac/Linux
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Deployment verification checklist

### Monitoring & Operations (NEW - v1.7.0)

- **[MONITORING_ARCHITECTURE.md](MONITORING_ARCHITECTURE.md)** - Comprehensive monitoring architecture guide
  - On-demand vs eager activation modes
  - Docker-only deployment constraints
  - Security considerations and hardening
  - Troubleshooting and performance impact
- **[../monitoring/README.md](../monitoring/README.md)** - Monitoring quick reference
  - Configuration for Prometheus, Grafana, Loki
  - Alert rules and dashboard customization
- **[operations/MONITORING.md](operations/MONITORING.md)** - Monitoring operations guide
- **[../backend/CONTROL_API.md](../backend/CONTROL_API.md)** - Control API documentation (Updated)
  - Monitoring lifecycle endpoints
  - Audit logging specifications
  - Security considerations for control operations

### Performance & Optimization

- **[PERFORMANCE_OPTIMIZATIONS_2025-01-10.md](../PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)** - Latest performance improvements
  - Database indexing (+40% query speed)
  - Response caching (+70% faster)
  - N+1 query fixes (100x reduction)
  - React optimization (+60-70% render speed)

---

## 📂 Documentation by Role

### 👤 For End Users

**Start here**: [user/INDEX.md](user/INDEX.md)

- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - Get started in 5 minutes
- **[user/THEME_GUIDE.md](user/THEME_GUIDE.md)** - Customize UI themes
- **[user/THEMES_SUMMARY.md](user/THEMES_SUMMARY.md)** - Available themes overview
- **[user/LOCALIZATION.md](user/LOCALIZATION.md)** - Language switching (EN/EL)

### 💻 For Developers

**Start here**: [development/INDEX.md](development/INDEX.md)

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[development/ARCHITECTURE_DIAGRAMS.md](development/ARCHITECTURE_DIAGRAMS.md)** - Visual system workflows
- **[development/AUTHENTICATION.md](development/AUTHENTICATION.md)** - Auth implementation guide
- **[development/DEVELOPER_FAST_START.md](development/DEVELOPER_FAST_START.md)** - Developer quick start
- **[development/API_EXAMPLES.md](development/API_EXAMPLES.md)** - Common API examples
- **[development/LOAD_TEST_PLAYBOOK.md](development/LOAD_TEST_PLAYBOOK.md)** - Load testing guide

### 🚀 For DevOps/Operators

**Start here**: [deployment/INDEX.md](deployment/INDEX.md)

- **[deployment/DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)** - Docker commands and management
- **[deployment/DEPLOY.md](deployment/DEPLOY.md)** - Deployment procedures
- **[deployment/RUNBOOK.md](deployment/RUNBOOK.md)** - Operational runbook
- **[FRESH_DEPLOYMENT_TROUBLESHOOTING.md](FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common deployment issues
- **[REBUILD_TROUBLESHOOTING.md](REBUILD_TROUBLESHOOTING.md)** - Rebuild troubleshooting
- **[DEPLOYMENT_ASSET_TRACKER.md](DEPLOYMENT_ASSET_TRACKER.md)** - Release readiness inventory


### Release Automation

- **[docs/releases/v1.6.5.md](releases/v1.6.5.md)** - Canonical release notes for the Control API realignment and restart UX polish
- **[docs/releases/v1.6.3.md](releases/v1.6.3.md)** - Previous release notes covering the archive/cleanup checklist
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
| 🧪 Draft | 4 | New skeletons pending expansion |
| 🔍 Audit Workflow | 1 | GitHub Action enforcing freshness & status (doc-audit.yml) |

### Archived Historical Docs

The following documents have been moved to `archive/` for historical reference:

**2025-11-16 Archival Wave** (Completed analyses & cleanup artifacts):

| File | Original Date | Category |
|------|---------------|----------|
| `APP_LIFECYCLE_EVALUATION.md` | 2025-11-06 | Lifecycle evaluation (completed) |
| `ARTIFACT_STRATEGY.md` | Planning | Strategy doc (implemented) |
| `CI_MONITORING_CHANGES_SUMMARY.md` | 2025-11-11 | Change summary |
| `CLEANUP_COMPLETE.md` | 2025-11-16 | Cleanup report |
| `CLEANUP_SUMMARY.md` | 2025-11-16 | Technical summary |
| `CODE_REVIEW_FINDINGS.md` | 2025-10-29 | Code review (v1.0) |
| `DEPENDENCY_UPGRADES.md` | 2025 (stale) | Upgrade analysis |
| `DOCUMENTATION_CLEANUP_2025-01-10.md` | 2025-01-10 | Doc consolidation |
| `FRONTEND_ASSESSMENT.md` | 2025 (stale) | Frontend assessment |
| `GITHUB_RELEASE_DRAFT_v1.2.0.md` | Historical | Release draft |
| `HISTORY_PURGE_PLAN.md` | Planning | Purge planning |
| `MODE_AWARE_UI_QUICK_REFERENCE.md` | Feature ref | UI reference |
| `NEXT_STEPS.md` | 2025-11-16 | Action items |
| `PR_DRAFT.md` | Historical | PR description |
| `REMOVED_DOCS_SUMMARY.md` | 2025-11-04 | Removal summary |
| `ROUTER_REFACTORING_STATUS.md` | 2025-11-06 | Refactoring status |
| `SECURITY_AUDIT.md` | 2025 (stale) | Security audit |
| `TERMINAL_BEST_PRACTICES.md` | 2025-10-29 | Terminal practices |
| `V1.2.0_IMPROVEMENTS.md` | Historical | Version improvements |
| `scripts/stage_and_commit.ps1` | 2025-11-16 | Automation script |

### New Additions (2025-11-16)

1. 🧪 **RUNBOOK.md (draft)** added under `docs/deployment/` for structured deployment & rollback steps.
2. 🧪 **API_EXAMPLES.md (draft)** added under `docs/development/` centralizing typical request/response patterns.
3. 🔗 **README.md** now links directly to this index for faster discovery.
4. 📦 Documentation count table updated to distinguish active vs draft artifacts.

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
**Last comprehensive audit**: 2025-11-15

---

## Index Update (2025-11-16)

Draft document set expanded to 4 and Status Summary table updated accordingly:

- `docs/deployment/RUNBOOK.md`
- `docs/development/API_EXAMPLES.md`
- `docs/development/ARCHITECTURE_DIAGRAMS.md`
- `docs/development/LOAD_TEST_PLAYBOOK.md`

Added automated documentation audit workflow (`.github/workflows/doc-audit.yml`) to fail PRs introducing stale or missing-status docs.

Archived 20 historical documents and scripts to `archive/` for audit/reference:

- Completed analyses (code review, lifecycle evaluation, router refactoring status)
- Stale assessments (frontend, security, dependencies from 2025)
- Cleanup artifacts (Nov 2025 cleanup reports and summaries)
- Planning documents (artifact strategy, history purge plan)
- One-time automation scripts (stage_and_commit.ps1)

See `archive/README.md` for complete inventory and retrieval instructions.

Future drafts should increment the draft count and include **Status** & **Last Updated** lines.
