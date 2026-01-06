# Documentation Index

**Last Updated**: 2026-01-06
**Version**: 1.15.0

This document serves as the single source of truth for all project documentation, eliminating confusion from duplicate or outdated files.

> **Recent Changes (Jan 6, 2026)**: Phase 1 COMPLETE ✅ - v1.15.0 released with all 8 improvements delivered. Phase 2 planning underway. See [PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md), [releases/RELEASE_NOTES_v1.15.0.md](releases/RELEASE_NOTES_v1.15.0.md), and [plans/PHASE2_CONSOLIDATED_PLAN.md](plans/PHASE2_CONSOLIDATED_PLAN.md).

---

## 🗂️ Documentation Structure

Documentation is organized into four main directories:

- **[user/](user/)** - User guides, quick starts, and how-tos → [INDEX](user/INDEX.md)
- **[development/](development/)** - Technical docs, architecture, APIs → [INDEX](development/INDEX.md)
- **[deployment/](deployment/)** - Operations, deployment, troubleshooting → [INDEX](deployment/INDEX.md)
- **[reference/](reference/)** - Quick reference guides (scripts, security, Docker) → NEW

---

## 📁 Folder Map (key subfolders)

- CI:
  - `docs/ci/` – CI diagnostics and failure reports (e.g., GitHub Actions)
- Deployment:
  - `docs/deployment/` – Guides, runbooks, operations
  - `docs/deployment/reports/` – Versioned deployment reports
- Releases:
  - `docs/releases/` – Release notes and summaries
  - `docs/releases/reports/` – Release completion/verification reports (non-notes)
- Development:
  - `docs/development/testing/` – E2E errors and testing improvements
  - `docs/development/ai/` – Agent/automation instructions
- Reports (dated):
  - `docs/reports/YYYY-MM/` – Summary/report-style docs bucketed by month
- Planning:
  - `docs/plans/` – Plans, priority lists, roadmaps (non-archival)
- Miscellaneous:
  - `docs/misc/` – Temporary or uncategorized docs; move to a specific folder when clear

This map complements the top-level structure and ensures stray Markdown files are consolidated under `docs/` for discoverability and consistency.

## 📚 Core Documentation (Current & Active)

### Getting Started

- **[README.md](../README.md)** - Main project documentation, features, quick start
- **[TODO.md](../TODO.md)** - Current task list and project roadmap
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes (Updated 2025-12-06)

### Audit & Improvement Planning (v1.15.0 - COMPLETE ✅)

- **[CODEBASE_AUDIT_REPORT.md](../CODEBASE_AUDIT_REPORT.md)** - Comprehensive codebase audit with 50+ recommendations
  - Grade: A- (8.5/10) - Production Ready
  - 12 sections covering security, architecture, performance, quality
- **[misc/IMPLEMENTATION_PATTERNS.md](misc/IMPLEMENTATION_PATTERNS.md)** - Copy-paste ready code patterns for v1.15.0 improvements
- **[misc/IMPLEMENTATION_PATTERNS.md](misc/IMPLEMENTATION_PATTERNS.md)** - Copy-paste ready code patterns for v1.15.0 improvements
  - Audit logging pattern (model + service + router)
  - Query optimization with eager loading examples
  - Soft delete auto-filtering mixin
  - API response standardization wrapper
  - Error handling improvements
  - Business metrics calculation
  - Test patterns and utilities

### Phase 1 (v1.15.0) - COMPLETE ✅

- **[PHASE1_COMPLETION_SUMMARY.md](PHASE1_COMPLETION_SUMMARY.md)** - Phase 1 final status (NEW - Jan 5, 2026)
  - All 8 improvements delivered (100% complete)
  - 316/316 backend tests passing
  - 30+ E2E tests implemented
  - Complete feature breakdown and metrics
- **[plans/PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md](plans/PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md)** - Phase 1 implementation plan
  - 8 major improvements (audit logging, performance, security, UX)
  - 2-week sprint breakdown (Jan 7-20, 2026)
  - Team allocation and effort estimates
  - Success metrics and acceptance criteria
  - Links to implementation patterns
- **[releases/RELEASE_PREPARATION_v1.15.0.md](releases/RELEASE_PREPARATION_v1.15.0.md)** - v1.15.0 Release preparation & timeline
  - Phase 0 validation (all tests passing)
  - Phase 1 infrastructure improvements roadmap
  - Release checklist and success metrics
  - Timeline: Jan 7-24, 2026 (implementation + release)
- **[releases/RELEASE_NOTES_v1.15.0.md](releases/RELEASE_NOTES_v1.15.0.md)** - v1.15.0 Official release notes (NEW - Jan 6, 2026)
  - Complete feature list with detailed descriptions
  - Performance improvements and metrics
  - Upgrade instructions and breaking changes
  - What's next (Phase 2 preview)
- **[releases/EXECUTION_TRACKER_v1.15.0.md](releases/EXECUTION_TRACKER_v1.15.0.md)** - v1.15.0 Phase 1 execution tracker
  - Pre-implementation tasks (team kickoff, environment setup, backup)
  - Week 1 tasks: Foundation & performance improvements
  - Week 2 tasks: Testing & stability
  - Release day procedures and post-release validation
  - Progress tracking with owner assignments and effort estimates
- **[releases/QUICK_REFERENCE_v1.15.0.md](releases/QUICK_REFERENCE_v1.15.0.md)** - v1.15.0 Quick reference card (Print & Post)
  - One-page team reference with timeline and task assignments
  - Daily checklist for developers
  - Blocker resolution procedure
  - Key documents bookmarks
  - Team contact information
- **[PHASE1_READINESS_REVIEW.md](PHASE1_READINESS_REVIEW.md)** - Phase 1 pre-kickoff validation
- **[PHASE1_REVIEW_FINDINGS.md](PHASE1_REVIEW_FINDINGS.md)** - Quality review findings
- **[PHASE1_TEAM_ONBOARDING.md](PHASE1_TEAM_ONBOARDING.md)** - Team kickoff guide

### Phase 2 (v1.16.0) - PLANNING 📋

- **[plans/PHASE2_CONSOLIDATED_PLAN.md](plans/PHASE2_CONSOLIDATED_PLAN.md)** - Phase 2 unified implementation plan (NEW - Jan 6, 2026)
  - Fine-grained RBAC with permission-based access
  - CI/CD improvements with coverage reporting
  - Load testing integration
  - Performance monitoring dashboard
  - 4-6 week timeline (Feb/March 2026)
  - Consolidates three parallel tracks into one roadmap
- **[plans/RBAC_PHASE2.4_PLAN.md](plans/RBAC_PHASE2.4_PLAN.md)** - Original RBAC plan (superseded by consolidated plan)
- **[plans/REMAINING_ISSUES_PRIORITY_PLAN.md](plans/REMAINING_ISSUES_PRIORITY_PLAN.md)** - Original CI/CD issues (superseded by consolidated plan)
- **[plans/REMAINING_ISSUES_PRIORITIZED.md](plans/REMAINING_ISSUES_PRIORITIZED.md)** - Prioritized action plan post-Phase 1 (NEW - Jan 6, 2026)
  - 8 issues organized by priority (CRITICAL, HIGH, MEDIUM, LOW)
  - Week-by-week work order
  - Effort estimates and timelines
  - Success criteria for each issue
- **[plans/INSTALLER_IMPROVEMENTS_v1.12.3+.md](plans/INSTALLER_IMPROVEMENTS_v1.12.3+.md)** - Installer improvements (mostly complete)
- **[development/VERSION_1_9_9_IMPROVEMENTS.md](development/VERSION_1_9_9_IMPROVEMENTS.md)** - Latest improvements summary (NEW - 1.9.9)
  - Frontend routing type safety and React Router v7 validation
  - International locale support (European decimal separators)
  - Backend test infrastructure improvements
  - Test results and verification checklist
- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - Quick start for new users
- **[user/RATE_LIMITING_GUIDE.md](user/RATE_LIMITING_GUIDE.md)** - Rate limiting control & configuration (NEW - 1.14.0)
  - Admin control panel for dynamic rate limits
  - Per-endpoint rate limit types and defaults
  - Environment variable configuration
  - REST API reference for administrators
- **[user/RATE_LIMITING_QUICK_REFERENCE.md](user/RATE_LIMITING_QUICK_REFERENCE.md)** - Quick reference for rate limits (NEW - 1.14.0)
  - Quick start for admins
  - Common issue troubleshooting
  - API examples and environment variables
- **[ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](../ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Greek quick start guide
- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](../ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Greek user manual

### Installation & Deployment

- **[INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)** - Step-by-step installation for Windows/Mac/Linux
- **[DEPLOY_ON_NEW_PC.md](../DEPLOY_ON_NEW_PC.md)** - Complete fresh installation guide
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Production deployment guide
- **[DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Deployment verification checklist
- **[deployment/POSTGRES_MIGRATION_GUIDE.md](deployment/POSTGRES_MIGRATION_GUIDE.md)** - Step-by-step SQLite → PostgreSQL migration workflow
- **[installer/README.md](../installer/README.md)** - Windows installer build & distribution (Inno Setup canonical workflow)

### Monitoring & Operations ($11.9.7+)

- **[operations/MONITORING.md](operations/MONITORING.md)** - Canonical monitoring & alerting guide
  - On-demand vs eager activation modes
  - Docker-only deployment constraints
  - Security considerations and hardening
  - Troubleshooting and performance impact
- **[../monitoring/README.md](../monitoring/README.md)** - Monitoring quick reference
  - Configuration for Prometheus, Grafana, Loki
  - Alert rules and dashboard customization
- **[operations/MONITORING.md](operations/MONITORING.md)** - Monitoring operations guide (canonical)
- **[user/SESSION_EXPORT_IMPORT_GUIDE.md](user/SESSION_EXPORT_IMPORT_GUIDE.md)** - Session export/import user guide (canonical)
- **[../backend/CONTROL_API.md](../backend/CONTROL_API.md)** - Control API documentation (Updated)
  - Monitoring lifecycle endpoints
  - Audit logging specifications
  - Security considerations for control operations

### Code Architecture & Refactoring (NEW - $11.9.7)

- **[CONTROL_ROUTER_REFACTORING.md](CONTROL_ROUTER_REFACTORING.md)** - Control router refactoring guide
  - Modular architecture design
  - Migration from monolithic to modular structure
  - Development guidelines and best practices
  - Testing strategy and troubleshooting
  - Module responsibilities and usage examples

- **[ROUTING_VALIDATION_FIXES.md](../ROUTING_VALIDATION_FIXES.md)** - React Router v7 routing improvements (NEW - 1.9.9)
  - React Router v7 layout route pattern validation
  - Type-safe useParams implementation with StudentProfileParams interface
  - Route configuration validation against navigation settings
  - Comprehensive reference for routing architecture and maintenance

### Performance & Optimization

- **[operations/SQLITE_TO_POSTGRESQL_MIGRATION.md](operations/SQLITE_TO_POSTGRESQL_MIGRATION.md)** - SQLite to PostgreSQL migration guide (NEW - $11.9.7)
  - Why migrate? (Concurrency, scalability, production requirements)
  - Step-by-step migration procedure
  - Performance tuning and monitoring
  - Rollback procedures and troubleshooting
- **[Archive: Performance Optimizations](../archive/sessions_2025-11/PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)** - Latest performance improvements (Archived)
  - Database indexing (+40% query speed)
  - Response caching (+70% faster)
  - N+1 query fixes (100x reduction)
  - React optimization (+60-70% render speed)
- **Database Connection Pooling** (NEW - $11.9.7)
  - PostgreSQL: pool_size=20, max_overflow=10, pool_pre_ping=True
  - SQLite: NullPool to avoid locking issues
  - See `backend/models.py` lines 367-411

### Scripts & Operations

- **[SCRIPTS_CONSOLIDATION_GUIDE.md](../archive/pre-$11.9.7/SCRIPTS_CONSOLIDATION_GUIDE.md)** (archived) - v2.0 Scripts Migration Guide
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

### Workspace Consolidation ($11.10.1 - $11.10.1)

- **Complete Consolidation Journey** (Dec 2025):

- **[development/phase-reports/PHASE1_CONSOLIDATION_COMPLETE.md](development/phase-reports/PHASE1_CONSOLIDATION_COMPLETE.md)** - Phase 1: Code Organization (✅ COMPLETE)
  - Backend database utilities consolidated → `backend/db/cli/`
  - Import validation unified → `scripts/utils/validators/import_checker.py`
  - Scripts reorganized → `scripts/utils/` (50+ files)
  - Backward compatibility fully maintained
  - Test results: 378 backend + 1033 frontend tests passing

- **[development/phase-reports/PHASE2_CONSOLIDATION_COMPLETE.md](development/phase-reports/PHASE2_CONSOLIDATION_COMPLETE.md)** - Phase 2: Management Simplification (✅ COMPLETE)
  - SMS.ps1 meta-wrapper created (universal entry point)
  - Configuration strategy documented (root .env as authoritative)
  - Help system implemented and tested
  - Usage examples provided for all operations

- **[development/phase-reports/PHASE3_CONSOLIDATION_PLAN.md](development/phase-reports/PHASE3_CONSOLIDATION_PLAN.md)** - Phase 3: Documentation & Polish (📋 IN PROGRESS - $11.10.1)
  - Task 1: Documentation consolidation (establish `docs/DOCUMENTATION_INDEX.md` as source of truth)
  - Task 2: Backend scripts organization (`backend/scripts/` hierarchy)
  - Task 3: Symlink management strategy (Windows-compatible approach)
  - Timeline: 13.5 hours estimated | Target: Dec 12, 2025

**Related Documentation**:

- **[development/TOOLS_CONSOLIDATION.md](development/TOOLS_CONSOLIDATION.md)** - Backend migration guide
  - Why consolidate? (organization, discoverability)
  - Deprecated import paths with timeline
  - New import structure with examples
  - FAQ and troubleshooting

- **[CONFIG_STRATEGY.md](../CONFIG_STRATEGY.md)** - Environment configuration strategy
  - .env file hierarchy and sourcing order
  - Root .env as single source of truth
  - Configuration sourcing for Docker and native modes
  - Migration timeline ($11.10.1 → $11.10.1 → $11.10.1)

- **[archive/consolidation-planning-2025-12-09/](../archive/consolidation-planning-2025-12-09/)** - Planning documents
  - CONSOLIDATION_EXECUTIVE_SUMMARY.md - Overall plan and impact
  - WORKSPACE_CONSOLIDATION_ANALYSIS.md - Deep analysis of 6 consolidation opportunities
  - PHASE_1_MIGRATION_REPORT.md - Detailed Phase 1 execution report

### Validation & Smoke Tests

- **[operations/SMOKE_TEST_CHECKLIST_v1.12.md](operations/SMOKE_TEST_CHECKLIST_v1.12.md)** - Current smoke test checklist for v1.12.x
- Legacy reference: **[archive/documentation/checklists/SMOKE_TEST_CHECKLIST_$11.12.2.md](../archive/documentation/checklists/SMOKE_TEST_CHECKLIST_$11.12.2.md)**

### Historical Reports & Checklists (Archived)

- **[archive/documentation/reports/IMPROVEMENTS_AUDIT_REPORT.md](../archive/documentation/reports/IMPROVEMENTS_AUDIT_REPORT.md)** - Frontend & DevOps improvements audit (1.9.7)
- **[archive/documentation/reports/DOCUMENTATION_UPDATE_SUMMARY_v1_9_9.md](../archive/documentation/reports/DOCUMENTATION_UPDATE_SUMMARY_v1_9_9.md)** - Documentation updates summary (1.9.9)
- **[archive/documentation/reports/PRE_RELEASE_DOCUMENTATION_AUDIT.md](../archive/documentation/reports/PRE_RELEASE_DOCUMENTATION_AUDIT.md)** - Pre-release documentation audit (1.9.7)
- **[archive/documentation/automation/markdown_lint_report.md](../archive/documentation/automation/markdown_lint_report.md)** - Archived lint report placeholder
- **[archive/pr-updates/](../archive/pr-updates/)** - Historical PR-specific update notes

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
- **[user/RBAC_GUIDE.md](user/RBAC_GUIDE.md)** - Roles & permissions guide (admin endpoints, defaults, safeguards)
- **[user/RBAC_GUIDE_EL.md](user/RBAC_GUIDE_EL.md)** - Οδηγός ρόλων & δικαιωμάτων (στα Ελληνικά)

**Greek Language**:

- **[ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](../ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Οδηγός γρήγορης εκκίνησης
- **[ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](../ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Πλήρες εγχειρίδιο χρήστη
- **[user/RBAC_GUIDE_EL.md](user/RBAC_GUIDE_EL.md)** - Οδηγός ρόλων & δικαιωμάτων (admin endpoints, προεπιλογές, ασφάλεια)

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

- **[development/DEVELOPER_FAST_START.md](development/DEVELOPER_FAST_START.md)** (archived reference) - Use DEVELOPER_GUIDE_COMPLETE instead
- **[development/DEVELOPMENT_SETUP_GUIDE.md](development/DEVELOPMENT_SETUP_GUIDE.md)** (reference) - Comprehensive setup guide (content consolidated in DEVELOPER_GUIDE_COMPLETE)
- **[development/PRE_COMMIT_GUIDE.md](development/PRE_COMMIT_GUIDE.md)** ⭐ NEW - Unified pre-commit workflow
  - Replaces PRE_COMMIT_AUTOMATION.md, PRECOMMIT_INSTRUCTIONS.md, pre-commit-workflow.md (archived to `archive/pre-commit-2025-12-06/`)
  - Covers COMMIT_READY.ps1 modes, hooks installation, DEV_EASE policy, troubleshooting
- **[development/VERSION_MANAGEMENT_GUIDE.md](development/VERSION_MANAGEMENT_GUIDE.md)** ⭐ NEW - Version automation (VERIFY_VERSION.ps1) + CI/hooks/pip note
  - Replaces VERSION_AUTOMATION_GUIDE.md, VERSION_MANAGEMENT_QUICK_REF.md, version-automation.md, PIP_VERSION.md (archived to `archive/version-management-2025-12-06/`)
- **[development/AUTOSAVE_PATTERN.md](development/AUTOSAVE_PATTERN.md)** - Canonical autosave pattern (coverage, auth review, troubleshooting)
  - Supersedes autosave summaries (archived to `archive/autosave-2025-12-06/`)
- **[development/LOAD_TEST_PLAYBOOK.md](development/LOAD_TEST_PLAYBOOK.md)** - Load testing guide

**E2E Testing** (NEW - v1.15.0):

- **[E2E_TESTING_GUIDE.md](../E2E_TESTING_GUIDE.md)** ⭐ - Comprehensive E2E testing guide
  - Quick start (5-10 minutes)
  - Running tests (all, specific, debug, watch modes)
  - Debugging failing tests (inspector, screenshots, logging, patterns)
  - Common issues & solutions (auth, selectors, timeouts, CI differences)
  - Best practices (do's and don'ts)
  - Architecture overview and authentication flow
  - CI integration with GitHub Actions
- **[E2E_TESTING_TROUBLESHOOTING.md](../E2E_TESTING_TROUBLESHOOTING.md)** ⭐ - Troubleshooting & FAQ
  - Quick diagnosis flow
  - 15+ FAQ entries with solutions
  - Common fixes by symptom
  - Get help checklist with diagnostic collection
- **[E2E_AUTHENTICATION_FIX.md](../E2E_AUTHENTICATION_FIX.md)** - Authentication blocker resolution (v1.15.0)
  - Issue: Tests redirect back to login after successful authentication
  - Root cause: Missing user profile object in localStorage
  - Solution: loginViaAPI() now fetches and sets both JWT token and user object
  - Validation and verification procedures
- **[development/E2E_AUTHENTICATION_FIXES.md](development/E2E_AUTHENTICATION_FIXES.md)** - Technical deep dive on authentication fixes
- **[development/E2E_SESSION_SUMMARY_2025-01-05.md](development/E2E_SESSION_SUMMARY_2025-01-05.md)** - Complete session record of E2E fix implementation

### 🚀 For DevOps/Operators

**Start here**: [deployment/INDEX.md](deployment/INDEX.md)

**Deployment**:

- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Production deployment guide
- **[DEPLOY_ON_NEW_PC.md](../DEPLOY_ON_NEW_PC.md)** - Fresh installation (automated + manual)
- **[deployment/DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)** - Docker commands and management
- **[deployment/DEPLOY.md](deployment/DEPLOY.md)** - Deployment procedures
- **[deployment/RUNBOOK.md](deployment/RUNBOOK.md)** - Operational runbook
- **[deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md](deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md)** ⭐ NEW - Consolidated QNAP guide (standard, ARM/TS-431P3, virtual host) with deep dives archived

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
- **[operations/CI_CACHE_OPTIMIZATION.md](operations/CI_CACHE_OPTIMIZATION.md)** - CI/CD cache performance optimization ($11.11.1+)
  - npm dependency caching (30-45s savings)
  - Playwright browser caching (45-60s savings)
  - Expected 95% speedup on cache hits
  - **Monitoring**: [`../scripts/README_MONITOR_CI_CACHE.md`](../scripts/README_MONITOR_CI_CACHE.md)
    - GitHub Actions cache performance monitoring
    - Empirical metrics collection and validation
    - CLI tool for analyzing workflow runs

**Reference Guides** (NEW):

- **[SECURITY_GUIDE_COMPLETE.md](SECURITY_GUIDE_COMPLETE.md)** - **NEW consolidated security guide (Dec 2025)**
  - Replaces: SECURITY.md, SECURITY_AUDIT_REPORT.md, SECURITY_FIX_SUMMARY.md (archived to `archive/security-audit-2025-12-06/`)
  - Includes SECRET_KEY requirements, admin hardening, SQL injection verification, audit results, emergency procedures
- **[reference/SECURITY_GUIDE.md](reference/SECURITY_GUIDE.md)** - Legacy security quick reference (supplementary)
- **[reference/DOCKER_CLEANUP_GUIDE.md](reference/DOCKER_CLEANUP_GUIDE.md)** - Docker cleanup procedures

### Release Automation

- **[releases/RELEASE_NOTES_$11.12.2.md](releases/RELEASE_NOTES_$11.12.2.md)** - Latest production release notes (Dec 13, 2025)
- **[releases/RELEASE_AUDIT_$11.12.2.md](releases/RELEASE_AUDIT_$11.12.2.md)** - QA audit and verification follow-up
- **[releases/RELEASE_PREPARATION_$11.12.2.md](releases/RELEASE_PREPARATION_$11.12.2.md)** - Pre-release checklist and dry-run outcomes
- **[`scripts/ops/archive-releases.ps1`](../scripts/ops/archive-releases.ps1)** - CLI helper for archiving historical tags (supports `-DryRun`; fixture: `scripts/ops/samples/releases.sample.json`)
- **[`.github/workflows/archive-legacy-releases.yml`](../.github/workflows/archive-legacy-releases.yml)** - Manual Action wrapper around the archival script
- **[`scripts/ops/remove-legacy-packages.ps1`](../scripts/ops/remove-legacy-packages.ps1)** - GHCR cleanup helper (remove or privatize legacy images; fixture: `scripts/ops/samples/package-versions.sample.json`)

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

#### Earlier Sessions (Pre-$11.9.7)

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

**New archives (Dec 2025):**

- `archive/pre-commit-2025-12-06/` – legacy pre-commit docs
- `archive/version-management-2025-12-06/` – version automation + pip notes
- `archive/autosave-2025-12-06/` – autosave summaries/auth review
- `archive/qnap-2025-12-06/` – detailed QNAP plans (ARM, virtual host, compatibility)
- `archive/ci-cd-2025-12-06/` – CI/CD implementation summaries & change logs
- `archive/docker-cleanup-2025-12-06/` – legacy Docker cleanup guide

**Total:** 18 files archived (~500 KB, ~15,000 lines) + new December archive sets (see paths above)

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
**Last comprehensive audit**: 2026-01-06

---

## 📅 Recent Updates

### January 6, 2026 (v1.15.0 Released)

**Current Project Phase**: Phase 1 COMPLETE ✅ → Phase 2 Planning

**Major Updates**:
- ✅ Phase 1 complete: All 8 improvements delivered (v1.15.0 released Jan 5, 2026)
- ✅ Added comprehensive release notes for v1.15.0
- ✅ Phase 2 consolidated plan created (RBAC + CI/CD + Performance)
- ✅ Remaining issues prioritized and scheduled
- 📋 Phase 2 planning underway (targeting v1.16.0 for Feb/March 2026)

**New Documentation**:
- [releases/RELEASE_NOTES_v1.15.0.md](releases/RELEASE_NOTES_v1.15.0.md) - Official v1.15.0 release notes
- [releases/GITHUB_RELEASE_v1.15.0.md](releases/GITHUB_RELEASE_v1.15.0.md) - GitHub release draft
- [plans/PHASE2_CONSOLIDATED_PLAN.md](plans/PHASE2_CONSOLIDATED_PLAN.md) - Unified Phase 2 roadmap
- [plans/REMAINING_ISSUES_PRIORITIZED.md](plans/REMAINING_ISSUES_PRIORITIZED.md) - Post-Phase 1 priorities

**What's Next**:
1. Create GitHub Release for v1.15.0
2. Monitor E2E tests in CI
3. Set up coverage reporting
4. Begin Phase 2 Sprint 1 (RBAC design)

---

### January 5, 2026 (Phase 1 Complete)

**Major Updates**:
- ✅ Documentation consolidation complete (10 files archived)
- ✅ Phase 1 documentation complete (onboarding, patterns, tracker)
- ✅ All 8 Phase 1 improvements delivered and tested
- ✅ 316/316 backend tests passing, 30+ E2E tests ready

**Archive Note**:
- See `archive/pre-v1.15.0/CHANGELOG_ARCHIVE.md` for legacy history

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
**Session & Validation Records** (Organized in docs/development/sessions/):

Session validation and E2E testing fix records are now consolidated in the dedicated docs/development/sessions/ folder with consistent date-based naming:

- **[E2E_FIX_QUICK_REFERENCE_2025-01-05.md](development/sessions/E2E_FIX_QUICK_REFERENCE_2025-01-05.md)** - Quick reference for E2E authentication fix
- **[VALIDATION_REPORT_2025-01-05.md](development/sessions/VALIDATION_REPORT_2025-01-05.md)** - Validation report from session
- **[FINAL_VALIDATION_STATUS_2025-01-05.md](development/sessions/FINAL_VALIDATION_STATUS_2025-01-05.md)** - Final validation status and checklist
- **[RETEST_VALIDATION_2025-01-05.md](development/sessions/RETEST_VALIDATION_2025-01-05.md)** - Retest validation results

This structure ensures session records are organized chronologically by date, discoverable in a dedicated location, separate from primary documentation, and properly versioned and archived.

See docs/DOCUMENTATION_CONSOLIDATION_PLAN.md for the consolidation strategy and rationale.
