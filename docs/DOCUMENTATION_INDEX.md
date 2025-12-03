# Documentation Index

**Last Updated**: 2025-11-28
**Version**: 1.9.4

This document serves as the single source of truth for all project documentation, eliminating confusion from duplicate or outdated files.

> **Recent Changes (v1.9.0)**: Documentation has been reorganized into a cleaner structure with better categorization. All files are now in their proper directories.

---

## 🗂️ Documentation Structure

Documentation is organized into four main directories:

- **[user/](user/)** - User guides, quick starts, and how-tos → [INDEX](user/INDEX.md)
- **[development/](development/)** - Technical docs, architecture, APIs → [INDEX](development/INDEX.md)
- **[deployment/](deployment/)** - Operations, deployment, troubleshooting → [INDEX](deployment/INDEX.md)
- **[reference/](reference/)** - Quick reference guides (scripts, security, Docker) → NEW

---

## 📚 Core Documentation (Current & Active)

### Getting Started

- **[README.md](../README.md)** - Main project documentation, features, quick start
- **[TODO.md](../TODO.md)** - Current task list and project roadmap
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes (Updated 2025-11-22)
- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - Quick start for new users
- **[ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](../ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Greek quick start guide
- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](../ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Greek user manual

### Installation & Deployment

- **[INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)** - Step-by-step installation for Windows/Mac/Linux
- **[DEPLOY_ON_NEW_PC.md](../DEPLOY_ON_NEW_PC.md)** - Complete fresh installation guide
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Production deployment guide
- **[DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Deployment verification checklist
- **[deployment/POSTGRES_MIGRATION_GUIDE.md](deployment/POSTGRES_MIGRATION_GUIDE.md)** - Step-by-step SQLite → PostgreSQL migration workflow

### Monitoring & Operations (v1.8.3+)

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

### Code Architecture & Refactoring (NEW - v1.8.0)

- **[CONTROL_ROUTER_REFACTORING.md](CONTROL_ROUTER_REFACTORING.md)** - Control router refactoring guide
  - Modular architecture design
  - Migration from monolithic to modular structure
  - Development guidelines and best practices
  - Testing strategy and troubleshooting
  - Module responsibilities and usage examples

### Performance & Optimization

- **[operations/SQLITE_TO_POSTGRESQL_MIGRATION.md](operations/SQLITE_TO_POSTGRESQL_MIGRATION.md)** - SQLite to PostgreSQL migration guide (NEW - v1.9.6)
  - Why migrate? (Concurrency, scalability, production requirements)
  - Step-by-step migration procedure
  - Performance tuning and monitoring
  - Rollback procedures and troubleshooting
- **[Archive: Performance Optimizations](../archive/sessions_2025-11/PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)** - Latest performance improvements (Archived)
  - Database indexing (+40% query speed)
  - Response caching (+70% faster)
  - N+1 query fixes (100x reduction)
  - React optimization (+60-70% render speed)
- **Database Connection Pooling** (NEW - v1.9.6)
  - PostgreSQL: pool_size=20, max_overflow=10, pool_pre_ping=True
  - SQLite: NullPool to avoid locking issues
  - See `backend/models.py` lines 367-411

### Scripts & Operations

- **[SCRIPTS_CONSOLIDATION_GUIDE.md](../archive/pre-v1.9.1/SCRIPTS_CONSOLIDATION_GUIDE.md)** (archived) - v2.0 Scripts Migration Guide
  - **DOCKER.ps1** - All Docker deployment & management
  - **NATIVE.ps1** - Native development mode
  - Legacy script archive and migration notes
- **[docs/development/GIT_WORKFLOW.md](development/GIT_WORKFLOW.md)** - Git workflow and commit standards
  - Commit message conventions
  - Pre-commit automation (COMMIT_READY.ps1)
  - Branch strategy and release workflow
- **Static Analysis Configuration** (NEW - moved to `config/` directory)
  - `config/mypy.ini` - Type checking baseline
  - `config/pytest.ini` - Test runner configuration
  - `config/ruff.toml` - Linting rules
- **Docker Compose Files** (NEW - moved to `docker/` directory)
  - `docker/docker-compose.yml` - Main compose file
  - `docker/docker-compose.prod.yml` - Production overlay
  - `docker/docker-compose.monitoring.yml` - Monitoring stack
  - `docker/docker-compose.qnap.yml` - QNAP optimized

---

## 📂 Documentation by Role

### 👤 For End Users

**Start here**: [user/INDEX.md](user/INDEX.md)

**Comprehensive Guide**:

- **[user/USER_GUIDE_COMPLETE.md](user/USER_GUIDE_COMPLETE.md)** ⭐ NEW - Complete user manual
  - Installation & access (all methods)
  - Student, course, grade management
  - Attendance tracking
  - Reports & analytics
  - Import/export data
  - System settings
  - Troubleshooting
  - FAQs

**Quick References**:

- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - Get started in 5 minutes
- **[user/THEME_GUIDE.md](user/THEME_GUIDE.md)** - Customize UI themes
- **[user/THEMES_SUMMARY.md](user/THEMES_SUMMARY.md)** - Available themes overview
- **[user/LOCALIZATION.md](user/LOCALIZATION.md)** - Language switching (EN/EL)

**Greek Language**:

- **[ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](../ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Οδηγός γρήγορης εκκίνησης
- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](../ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Πλήρες εγχειρίδιο χρήστη

### 💻 For Developers

**Start here**: [development/INDEX.md](development/INDEX.md)

**Comprehensive Guide**:

- **[development/DEVELOPER_GUIDE_COMPLETE.md](development/DEVELOPER_GUIDE_COMPLETE.md)** ⭐ NEW - Complete developer manual
  - Quick start for developers (5-minute setup)
  - System architecture overview
  - Backend development (FastAPI, SQLAlchemy)
  - Frontend development (React, Vite)
  - Database & migrations (Alembic)
  - Authentication & security (JWT)
  - API development patterns
  - Testing (pytest, Playwright)
  - Performance optimization
  - Contributing guidelines

**Architecture & Design**:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[development/ARCHITECTURE_DIAGRAMS.md](development/ARCHITECTURE_DIAGRAMS.md)** - Visual system workflows
- **[development/AUTHENTICATION.md](development/AUTHENTICATION.md)** - Auth implementation guide
- **[development/API_EXAMPLES.md](development/API_EXAMPLES.md)** - Common API examples

**Development Tools**:

- **[development/DEVELOPER_FAST_START.md](development/DEVELOPER_FAST_START.md)** - Developer quick start
- **[development/DEVELOPMENT_SETUP_GUIDE.md](development/DEVELOPMENT_SETUP_GUIDE.md)** ⭐ NEW - Comprehensive setup & testing guide
  - Prerequisites & dependencies
  - Testing setup (pytest + Python 3.13 compatibility)
  - Pre-commit validation
  - Troubleshooting common issues
- **[development/LOAD_TEST_PLAYBOOK.md](development/LOAD_TEST_PLAYBOOK.md)** - Load testing guide

### 🚀 For DevOps/Operators

**Start here**: [deployment/INDEX.md](deployment/INDEX.md)

**Deployment**:

- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Production deployment guide
- **[DEPLOY_ON_NEW_PC.md](../DEPLOY_ON_NEW_PC.md)** - Fresh installation (automated + manual)
- **[deployment/DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)** - Docker commands and management
- **[deployment/DEPLOY.md](deployment/DEPLOY.md)** - Deployment procedures
- **[deployment/RUNBOOK.md](deployment/RUNBOOK.md)** - Operational runbook

**Troubleshooting**:

- **[FRESH_DEPLOYMENT_TROUBLESHOOTING.md](FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common deployment issues
- **[REBUILD_TROUBLESHOOTING.md](REBUILD_TROUBLESHOOTING.md)** - Rebuild troubleshooting
- **[DEPLOYMENT_ASSET_TRACKER.md](DEPLOYMENT_ASSET_TRACKER.md)** - Release readiness inventory

**Operations & Maintenance**:

- **[operations/CLEANUP_SCRIPTS_GUIDE.md](operations/CLEANUP_SCRIPTS_GUIDE.md)** ⭐ NEW - Comprehensive cleanup operations guide
  - All cleanup scripts inventory
  - Feature comparison matrix
  - Usage decision tree
  - Space savings potential

**Reference Guides** (NEW):

- **[reference/SECURITY_GUIDE.md](reference/SECURITY_GUIDE.md)** - Security best practices
- **[reference/DOCKER_CLEANUP_GUIDE.md](reference/DOCKER_CLEANUP_GUIDE.md)** - Docker cleanup procedures


### Release Automation

- **[docs/releases/v1.6.5.md](releases/v1.6.5.md)** - Canonical release notes for the Control API realignment and restart UX polish
- **[docs/releases/v1.6.3.md](releases/v1.6.3.md)** - Previous release notes covering the archive/cleanup checklist
- **[`scripts/ops/archive-releases.ps1`](../scripts/ops/archive-releases.ps1)** - CLI helper that archives all tags up to v1.6.2 (supports `-DryRun`, offline fixtures via `scripts/ops/samples/releases.sample.json`)
- **[`.github/workflows/archive-legacy-releases.yml`](../.github/workflows/archive-legacy-releases.yml)** - Manual Action wrapper around the archival script
- **[`scripts/ops/remove-legacy-packages.ps1`](../scripts/ops/remove-legacy-packages.ps1)** - GHCR cleanup helper (delete or privatize legacy images; offline fixture at `scripts/ops/samples/package-versions.sample.json`)


---

## 🗑️ Archived Documentation (November 2025)

Documentation consolidation is an ongoing effort. Session-specific documents are archived to reduce root directory clutter while preserving historical records.

### Recent Session Archives

#### Session 2025-11-28 - Documentation Consolidation

**Path:** `archive/sessions/2025-11-28/`
**Index:** [archive/sessions/2025-11-28/INDEX.md](../archive/sessions/2025-11-28/INDEX.md)

**Key Documents:**

- `REPOSITORY_AUDIT_SUMMARY.md` - Full repository audit (425 lines)
- Session consolidated 4 testing guides into 1 comprehensive guide

#### Earlier Sessions (Pre-v1.9.1)

**Path:** `archive/sessions_2025-11/`
**Archive Index:** [archive/sessions_2025-11/README.md](../archive/sessions_2025-11/README.md)

### What Was Archived

| Category | Files | Purpose |
|----------|-------|---------|
| **Auth Fix Session** | 4 files | Authentication fix documentation (Nov 21-22) |
| **Production Fixes** | 5 files | Installation & deployment improvements (Nov 21) |
| **Scripts Consolidation** | 2 files | Script consolidation reports (Nov 21) |
| **Analysis & Cleanup** | 3 files | Codebase analysis and cleanup (Nov 20) |
| **QNAP Deployment** | 3 files | QNAP deployment documentation (Nov 19-20) |
| **Performance** | 1 file | Performance optimizations summary (Jan 10) |

**Total:** 18 files archived (~500 KB, ~15,000 lines)

### Key Archived Documents

- `SESSION_2025-11-22_AUTH_FIX.md` - Comprehensive auth fix documentation
- `OPERATIONAL_STATUS.md` - System operational status report  
- `COMMIT_SUMMARY.md` - Commit preparation documentation
- `PERFORMANCE_OPTIMIZATIONS_2025-01-10.md` - Performance improvements
- `QNAP_DEPLOYMENT_REPORT.md` - QNAP deployment completion
- And 13 more session/temporal documents

### Accessing Archived Documents

```powershell
# View archive contents
Get-ChildItem "archive/sessions_2025-11" | Select-Object Name

# Read archived document
Get-Content "archive/sessions_2025-11/SESSION_2025-11-22_AUTH_FIX.md"

# Search archive
Get-ChildItem "archive/sessions_2025-11" -Filter "*.md" | Select-String "AUTH_MODE"
```

**See:** [Archive README](../archive/sessions_2025-11/README.md) for complete inventory and restoration procedures

---

## 📊 Documentation Health

### Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Active | 25+ | Current, maintained documentation |
| ⭐ NEW | 3 | Consolidated comprehensive guides |
| 📁 Archived | 18 | Historical session documents (Nov 2025) |
| 🧪 Draft | 4 | New skeletons pending expansion |

### Recent Updates (2025-11-25)

**Infrastructure & Quality Enhancements:**

1. ✨ **RFC 7807 Error Handling** - Global problem-details responses with regression tests
2. ✨ **Security Headers Middleware** - X-Frame-Options, X-Content-Type-Options, etc.
3. ✨ **Translation Integrity Tests** - Vitest suite ensuring EN/EL parity
4. 📁 **Config Directory** - Moved mypy.ini, pytest.ini, ruff.toml to `config/`
5. 📁 **Docker Directory** - Moved compose files to `docker/`
6. 📁 **Archived .bat Wrappers** - Moved to `archive/deprecated_bat_wrappers/`
7. ✨ **Maintenance Scripts** - VERIFY_WORKSPACE.ps1, CONSOLIDATE_BAT_WRAPPERS.ps1, UPDATE_FRONTEND_REFS.ps1

**Previous Updates (2025-11-22):**

1. ✨ **[user/USER_GUIDE_COMPLETE.md](user/USER_GUIDE_COMPLETE.md)** - Complete user manual (all features)
2. ✨ **[development/DEVELOPER_GUIDE_COMPLETE.md](development/DEVELOPER_GUIDE_COMPLETE.md)** - Complete developer manual (all workflows)
3. 📁 **Directory:** `docs/reference/` - Quick reference guides

**Root Directory Cleanup:**

- Before: 32+ .md files in root
- After: 11 essential .md files in root
- Reduction: 65% fewer root-level documents
- All historical documents preserved in archive

---

## 📚 Documentation Guidelines

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

**Learn about control router refactoring**
→ Read [docs/CONTROL_ROUTER_REFACTORING.md](CONTROL_ROUTER_REFACTORING.md)

**Troubleshoot Docker issues**
→ Check [docs/DOCKER_OPERATIONS.md](DOCKER_OPERATIONS.md)

**Implement authentication**
→ Follow [docs/AUTHENTICATION.md](AUTHENTICATION.md)

**Add translations**
→ Read [docs/user/LOCALIZATION.md](user/LOCALIZATION.md)

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
