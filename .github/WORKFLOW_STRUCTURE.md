# GitHub Actions Workflow Structure

**Quick Reference for 41 Active Workflows**

## 1. Core CI/CD Pipeline (1 workflow)
### Primary execution path for every push/PR:
- **ci-cd-pipeline.yml** - Main pipeline with 10 phases:
  - Phase 1: Version verification
  - Phase 2: Linting & secret scanning
  - Phase 3: Testing (backend, frontend, smoke)
  - Phase 4: Build (frontend, Docker)
  - Phase 5: Security scanning (multi-layer)
  - Phase 6: Documentation
  - Phase 7-8: Deployment gates & execution
  - Phase 9: Release management
  - Phase 10: Post-deployment monitoring

**Trigger:** `push:main`, `pull_request:main`, `workflow_dispatch`  
**Duration:** ~15-20 minutes  
**Key outputs:** Artifacts, test reports, deployment status

---

## 2. Release & Installation (5 workflows)
### Triggered when pushing version tags (v1.*.*)
- **release-on-tag.yml** - Creates GitHub release & triggers installer build
  - Validates tag format (v1.x.x)
  - Ensures tag on default branch
  - Creates release notes
  - **Dispatches:** release-installer-with-sha.yml

- **release-installer-with-sha.yml** - Builds Windows installer with SHA256 hash
  - PyInstaller bundling
  - Digital signing (if cert available)
  - SHA256 validation
  - **Publishes:** GitHub release assets

- **installer.yml** - Manual installer build (workflow_dispatch only)
  - .NET SMS_Manager launcher compilation
  - Inno Setup installer creation
  - Used for ad-hoc verification builds

- **release-asset-sanitizer.yml** - Cleanup of stale release assets
  - Prevents artifact pollution
  - Runs post-release

- **release-asset-lock.yml** - Policy enforcement
  - Ensures only `release-installer-with-sha.yml` modifies release assets
  - Security gate

---

## 3. Deployment (3 workflows)
### Executed via `ci-cd-pipeline.yml` deployment gates or manual dispatch
- **ci-cd-pipeline.yml** contains:
  - `staging-deploy-gate` job - Evaluates staging deployment policy
  - `deploy-staging` job - Executes on Windows self-hosted runner
  - `production-deploy-gate` job - Evaluates production policy
  - `deploy-production` job - Executes on Windows self-hosted runner
  - `post-deployment-monitoring` job - Health checks after production deploy

**Deployment logic:**
- Staging: Auto-deploy on push if `STAGING_DEPLOY_ENABLED=true` and `AUTO_DEPLOY_ON_PUSH=true`
- Production: Manual workflow_dispatch only, requires `PROD_DEPLOY_ENABLED=true`
- Both use `DOCKER.ps1` helper script

---

## 4. Security & Code Quality (9 workflows + embedded jobs)
### Parallel scans in ci-cd-pipeline + standalone workflows

**Embedded in ci-cd-pipeline.yml:**
- Linting (Ruff, MyPy, ESLint, TypeScript)
- Secret scanning (Gitleaks)
- Test coverage (Pytest, Vitest)
- Security scanning (Backend: Safety/Bandit/pip-audit, Frontend: npm audit, Docker: Trivy)

**Standalone workflows:**
- **codeql.yml** - CodeQL analysis (scheduled weekly)
- **dependency-review.yml** - PR dependency changes
- **trivy-scan.yml** - Container vulnerability scanning (scheduled)
- **fetch-code-scanning-sarif.yml** - Consolidates GitHub code scanning
- **upload-sarif.yml** - Uploads SARIF results

**Policy:**
- Warnings allowed in frontend ESLint (240 warnings tracked in docs)
- Security failures block deployment
- Coverage reports published to GitHub summary

---

## 5. Dependency Management (4 workflows)
### Keep dependencies up-to-date with safety checks

- **dependabot.yml** - Configuration (not a workflow, but GitHub app)
  - Auto-creates PRs for dependency updates
  - Grouped by scope (backend dev, backend, frontend dev, frontend)

- **dependabot-auto.yml** - Auto-merge safe updates
  - Merges patch updates for dev dependencies
  - Skips major/minor updates (requires manual review)

- **dependabot-pr-helper.yml** - Adds context to dependabot PRs
  - Links to CVEs
  - Adds severity labels

- **dependency-review.yml** - Licenses + vulnerability checks
  - Runs on PR to review new dependencies
  - Fails on high-severity vulnerabilities

---

## 6. Maintenance & Cleanup (8 workflows)
### Scheduled housekeeping tasks

**Scheduled (automated):**
- **stale.yml** - Close inactive issues/PRs (configurable age)
- **archive-legacy-releases.yml** - Archive old releases from active list
- **cleanup-workflow-runs.yml** - Remove old workflow run artifacts
- **cleanup-deployments.yml** - Remove stale deployment records
- **scheduled-production-health-check.yml** - Monitor prod health every 6 hours

**On-demand (workflow_dispatch):**
- **reset-workflows.yml** - Clear workflow run state (debugging)
- **codebase-cleanup.yml** - General repository cleanup
- **orchestrated-maintenance.yml** - Coordinated maintenance tasks

---

## 7. Documentation & Audits (6 workflows)
### Code quality and documentation validation

- **commit-ready.yml** - Pre-release checklist (workflow_dispatch)
  - Validates code quality, tests, docs
  - Checks version consistency
  - Runs smoke tests

- **commit-ready-smoke.yml** - Lightweight version check
- **commit-ready-cleanup-smoke.yml** - Cleanup + smoke tests
- **doc-audit.yml** - Check documentation TODOs and consistency
- **markdown-lint.yml** - Lint markdown files
- **docs-organization.yml** - Validate docs folder structure

---

## 8. Native Build Verification (2 workflows)
### Test native executable builds (Lite Edition)

- **native-setup-smoke.yml** - Smoke tests for native build
  - Verifies SMS_Native_Lite.exe initialization
  - Tests database setup

- **native-deepclean-safety.yml** - Deep cleanup validation
  - Ensures no artifacts left behind
  - Validates installer uninstall

---

## 9. Special Purpose (4 workflows)
### Specific integrations & automations

- **labeler.yml** - Auto-label PRs based on changed files
  - Reads `.github/labeler.yml` config
  - Adds topic labels (backend, frontend, security, docs)

- **operator-approval.yml** - Approval workflow gate
  - Validates operator identity for sensitive operations
  - (May be legacy/placeholder)

- **pr-hygiene.yml** - Enforce PR best practices
  - Checks for meaningful titles
  - Prevents commits to main
  - (May be legacy/placeholder)

- **version-consistency.yml** - Standalone version check
  - Validates VERSION file matches tag
  - Redundant with ci-cd-pipeline (consolidation candidate)

---

## 10. Testing (2 workflows)
### Specialized test suites

- **e2e-tests.yml** - End-to-end Playwright tests
  - Runs full app workflow tests
  - Triggered on PR or workflow_dispatch

- **load-testing.yml** - Performance/load testing
  - k6 load test execution
  - Triggered on workflow_dispatch

---

## 11. Configuration (3 files, not workflows)
### GitHub Actions configuration

- **.github/dependabot.yml** - Dependabot settings
  - Version update schedule
  - Grouping strategy

- **.github/labeler.yml** - PR labeling rules
  - File pattern → label mapping

- **.github/codeql/codeql-config.yml** - CodeQL analysis config
  - Query suites
  - Exclusion patterns

---

## 12. Custom Actions (1 action)
### Reusable action components

- **.github/actions/normalize-version/action.yml**
  - Reads VERSION file
  - Validates format (v1.x.x)
  - Outputs `version_tag`, `version_core`
  - **Used by:** ci-cd-pipeline, release-on-tag, installer, deployment jobs

---

## Workflow Statistics

| Category | Count | Triggered By |
|----------|-------|--------------|
| Core CI/CD | 1 | Push, PR, dispatch |
| Release/Install | 5 | Tags, dispatch |
| Deployment | 3 (in main) | Push gates, dispatch |
| Security | 9 | Every push, scheduled |
| Dependency | 4 | Dependabot, PR, scheduled |
| Maintenance | 8 | Scheduled, dispatch |
| Documentation | 6 | PR, dispatch, scheduled |
| Native Build | 2 | PR, dispatch |
| Special Purpose | 4 | PR, push, dispatch |
| Testing | 2 | PR, dispatch |
| **TOTAL** | **41** | **Multiple** |

---

## Execution Flow for Different Triggers

### On Pull Request to `main`:
1. `ci-cd-pipeline.yml` runs:
   - Phases 1-6 (lint, test, build, security, docs)
   - Phases 7-8 skip (no deployment on PR)
   - Phases 9-10 skip (no release)
2. `dependency-review.yml` (if deps changed)
3. Manual: `e2e-tests.yml`, `load-testing.yml`

### On Push to `main` (non-tag):
1. `ci-cd-pipeline.yml` runs (all phases)
   - Phases 1-6 execute
   - Deployment gates evaluate (may deploy to staging)
   - Release skips (no tag)
   - Monitoring skips

### On Tag Push (v1.*.*)
1. `ci-cd-pipeline.yml` runs (all phases, deployment gates may deploy to prod)
2. `release-on-tag.yml` runs:
   - Creates GitHub release
   - Dispatches `release-installer-with-sha.yml`
3. `release-installer-with-sha.yml` builds installer
4. `post-deployment-monitoring.yml` runs health checks

### Scheduled (Cron):
- `stale.yml` (weekly)
- `archive-legacy-releases.yml` (weekly)
- `cleanup-workflow-runs.yml` (daily)
- `scheduled-production-health-check.yml` (every 6 hours)
- `codeql.yml` (weekly)
- `trivy-scan.yml` (weekly)

---

## Environment Variables & Secrets

**Repository Variables (Settings > Environments):**
- `AUTO_DEPLOY_ON_PUSH` - Enable auto-deployment
- `STAGING_DEPLOY_ENABLED` - Allow staging deployment
- `STAGING_URL` - Staging server URL
- `PROD_DEPLOY_ENABLED` - Allow production deployment
- `PROD_URL` - Production server URL
- `DEPLOY_HOST` - Fallback host (if URL not set)

**Repository Secrets:**
- `GHCR_TOKEN` - Docker registry push (optional, falls back to GITHUB_TOKEN)
- `SLACK_WEBHOOK_URL` - Slack notifications (optional)
- `DEPLOY_HOST` - Production host (if not in vars)

**Self-Hosted Runner Labels:**
- `self-hosted, windows, staging-lan` - Staging deployment runner
- `self-hosted, windows, production-lan` - Production deployment runner

---

## Known Gaps & Opportunities

1. **Consolidation:** 41 workflows could be reduced to ~20 with careful grouping
2. **Deduplication:** Security scans (Safety + pip-audit) overlap
3. **Parallelization:** Security scans run after tests (could run in parallel)
4. **Documentation:** No centralized runbook (see `docs/cicd-review-report.md`)

---

**Last Updated:** June 3, 2026  
**Reviewer:** AI Code Assistant  
**Status:** Production-ready with optimization opportunities
