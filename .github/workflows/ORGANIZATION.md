# CI/CD Workflow Organization Guide

**Last Updated:** June 5, 2026  
**Total Workflows:** 37  
**Status:** Well-structured, ready for optimization

---

## Overview: 6 Functional Categories

All workflows in this directory are organized into logical categories based on their purpose and trigger patterns.

---

## Category 1: Core CI/CD Pipeline 🚀

**Purpose:** Main development workflow triggered on every push/PR to main branches.  
**Trigger:** `push` (main/phase-4-staging) + `pull_request` (main)  
**Duration:** ~15-20 minutes (optimized)

| Workflow | Purpose | Notes |
|----------|---------|-------|
| `ci-cd-pipeline.yml` | **Main orchestrator** - versioning, linting, testing, building, scanning, deployment gates | 2,300 lines; highly optimized; includes all critical checks |
| `version-verification.yml` | (Embedded in main) Windows-based version format validation | Also has workflow-version-policy check |
| `notify-completion.yml` | (Embedded in main) Slack notifications on completion | Runs regardless of pass/fail |

**Key Features:**
- ✅ Version consistency validation (v1.x.x format enforced)
- ✅ Linting (Ruff + MyPy for Python; ESLint + TypeScript for JS)
- ✅ Testing (Pytest backend, Vitest frontend, smoke tests)
- ✅ **Conditional E2E/Load Tests** (skipped on PRs unless labeled or `[full-test]`)
- ✅ Docker image build + push (with GitHub Container Registry)
- ✅ Security scanning (pip-audit, npm-audit, Trivy, Gitleaks)
- ✅ SARIF consolidation (unified GitHub Security tab)
- ✅ Deployment gates for staging/production
- ⚠️ Tests still embedded—can extract to `tests/` for reusability

**Time Savings (Phase 4 Feature):**
- PRs run **unit tests only** by default (~5 min)
- Main branch runs full suite including E2E/load (~20 min)
- Labeled PRs (`requires:e2e` or `[full-test]` in title) opt-in to extended tests

---

## Category 2: Build & Artifact Publishing 🏗️

**Purpose:** Build and publish Docker images, installers, and dependencies.  
**Trigger:** Manual dispatch, tags, or scheduled  
**Duration:** ~10-15 minutes per artifact

| Workflow | Purpose | Trigger | Notes |
|----------|---------|---------|-------|
| `installer.yml` | Build Windows installer (SMS_Installer_v*.exe) | Manual dispatch | PyInstaller build; produces 92.96 MB executable |
| `release-installer-with-sha.yml` | Upload installer to GitHub Release with SHA256 digest | Manual dispatch | Installer-only asset mutation policy enforced |
| `docker-publish.yml` | Manual Docker publish to GHCR + Docker Hub | Manual dispatch + input | Allows override of tag/registry |
| `backend-deps.yml` | Auto-update Python dependencies (Renovate/Dependabot) | Scheduled or Dependabot | Updates requirements.txt on new releases |
| `frontend-deps.yml` | Auto-update Node dependencies (Renovate/Dependabot) | Scheduled or Dependabot | Updates package.json on new releases |
| `sync-installer-artifact.yml` | ⚠️ **DUPLICATE** - sync installer between runs | Manual | **Candidate for consolidation with installer.yml** |

**Asset Security Policies:**
- Only `release-installer-with-sha.yml` can upload assets to releases
- Only `release-asset-sanitizer.yml` can delete release assets
- Prevents web artifacts (HTML, CSS, JS) from being published as releases

---

## Category 3: Security & Code Quality 🔒

**Purpose:** Vulnerability scanning, secret detection, dependency auditing.  
**Trigger:** Every push/PR or on-schedule  
**Duration:** ~5-10 minutes (parallelized)

| Workflow | Purpose | Trigger | Tool |
|----------|---------|---------|------|
| `codeql.yml` | SAST for Java, Python, JavaScript | Every push | GitHub CodeQL |
| `trivy-scan.yml` | Container + OS-level vulnerability scanning | Scheduled (daily) | Aqua Security Trivy |
| `dependency-review.yml` | Audit new dependencies in PRs | Pull request | GitHub Dependency Review |
| `upload-sarif.yml` | (Legacy) Upload SARIF manually | Manual dispatch | Generic SARIF uploader |
| `fetch-code-scanning-sarif.yml` | (Legacy) Fetch SARIF from GitHub | Manual dispatch | GitHub API |
| (Embedded in main) `security-scan-backend` | pip-audit + CVE detection | Every push | pip-audit |
| (Embedded in main) `security-scan-frontend` | npm-audit + module scanning | Every push | npm-audit |
| (Embedded in main) `security-scan-docker` | Trivy on local Dockerfiles | Non-PR | Trivy |
| (Embedded in main) `consolidate-sarif-reports` | Merge all SARIF into unified report | Always | Python script |

**Reporting:**
- All SARIF files → GitHub Security tab (Code scanning alerts)
- Unified audit: `unified-audit-results.sarif`
- Backend: `backend-audit.sarif` (pip-audit)
- Frontend: `frontend-audit.sarif` (npm-audit)
- Docker: `trivy-results.sarif` (container scan)

**Next Steps:**
- ✅ SARIF consolidation working in main pipeline
- 🔄 Consider extracting security scans to separate reusable workflows
- 🔄 Consider retiring `upload-sarif.yml` and `fetch-code-scanning-sarif.yml` (legacy)

---

## Category 4: Release & Deployment 🎯

**Purpose:** Manage GitHub Releases, tag-based deployments, staging/production gates.  
**Trigger:** Git tags (v1.x.x) or manual deployment  
**Duration:** ~5 min (gates) + ~15 min (deployment)

| Workflow | Purpose | Trigger | Notes |
|----------|---------|---------|-------|
| `release-on-tag.yml` | Create GitHub Release + release notes | Push tag (v1.x.x) | Centralized release management; notes from git history or file |
| `release-asset-sanitizer.yml` | Clean up old release assets, validate hygiene | Scheduled (monthly) | Prevents stale/invalid assets in releases |
| `archive-legacy-releases.yml` | Archive old releases to docs/releases/archive | Scheduled (quarterly) | Reduces clutter in GitHub Releases page |
| (Embedded in main) `staging-deploy-gate` | Evaluate if staging deployment should proceed | Always | Policy: actor, env vars, PROD_DEPLOY_ENABLED |
| (Embedded in main) `production-deploy-gate` | Evaluate if production deployment should proceed | Always | Policy: actor, env vars, tag format |
| (Embedded in main) `deploy-staging` | Deploy to staging environment | Self-hosted runner | Windows LAN runner; health checks post-deploy |
| (Embedded in main) `deploy-production` | Deploy to production environment | Self-hosted runner | Windows LAN runner; health checks post-deploy |

**Deployment Policy:**
- **Staging:** Auto-deploy on main branch if `AUTO_DEPLOY_ON_PUSH=true` and user is `bs1gr`
- **Production:** Manual gate (workflow dispatch or tag-based)
- Both require self-hosted Windows runners with specific labels
- Both run post-deployment health checks (exponential backoff)

**Release Asset Mutation Lock:**
- Job: `release-asset-lock` in main pipeline
- Policy: Only `release-installer-with-sha.yml` and `release-asset-sanitizer.yml` can mutate release assets
- Prevents accidental publishing of CI artifacts (HTML reports, coverage files, etc.)

---

## Category 5: Maintenance & Health 🧹

**Purpose:** Repository hygiene, scheduled cleanup, health monitoring.  
**Trigger:** Schedule (cron) or manual  
**Duration:** 5-30 minutes (varies)

### Scheduled Maintenance

| Workflow | Purpose | Schedule | Notes |
|----------|---------|----------|-------|
| `scheduled-production-health-check.yml` | Monitor production app health | Nightly (8 PM) | HTTP checks to `/health` endpoint |
| `cleanup-workflow-runs.yml` | Delete old workflow run logs | Weekly (Sunday) | Keeps GitHub Actions quota down |
| `cleanup-deployments.yml` | Remove old deployment records | Weekly (Sunday) | Keeps environment history clean |
| `orchestrated-maintenance.yml` | Master coordinator for cleanup tasks | Scheduled | Coordinates multiple cleanup jobs |
| `codebase-cleanup.yml` | Remove temp files, pycache, node_modules | Manual dispatch | Safe cleanup with validation |
| `docs-organization.yml` | Organize documentation, update index | Weekly (Sunday) | Keeps docs structure consistent |

### Repository Policy

| Workflow | Purpose | Trigger | Notes |
|----------|---------|---------|-------|
| `pr-hygiene.yml` | Auto-close stale/duplicate PRs | Scheduled (daily) | Keeps PR queue clean |
| `labeler.yml` | Auto-label PRs based on file changes | Pull request | Speeds up triage |
| `stale.yml` | Mark old issues as stale | Scheduled (daily) | Prevents backlog overflow |
| `apply-branch-protection.yml` | Enforce branch protection rules | Manual + scheduled | Requires review, status checks |
| `dependabot-auto.yml` | Auto-merge safe Dependabot updates | Pull request | Minor version updates only |
| `dependabot-pr-helper.yml` | Add context to Dependabot PRs | Pull request | Changelog + vulnerability info |
| `operator-approval.yml` | Approval workflow for sensitive changes | Manual | Requires human sign-off |

### Emergency/Recovery

| Workflow | Purpose | Notes |
|----------|---------|-------|
| `reset-workflows.yml` | Emergency reset of workflow state | Use if workflows get stuck/corrupted |
| `native-deepclean-safety.yml` | Deep cleanup for native edition builds | Removes all build artifacts safely |
| `native-setup-smoke.yml` | Quick smoke test for native edition | Validates native setup works |

---

## Category 6: Testing Workflows (Candidate for Extraction) 🧪

**Purpose:** Unit, integration, E2E, and load testing.  
**Status:** Currently embedded in `ci-cd-pipeline.yml`  
**Recommendation:** Extract to `tests/` subdirectory for reusability

| Workflow | Purpose | Embedded in Main | Trigger |
|----------|---------|------------------|---------|
| (Main) `test-backend` | Pytest with coverage | ci-cd-pipeline.yml | Every push/PR |
| (Main) `test-frontend` | Vitest with coverage | ci-cd-pipeline.yml | Every push/PR |
| (Main) `smoke-tests` | Server startup verification | ci-cd-pipeline.yml | Every push/PR |
| (Main) `run-e2e-tests` | Playwright E2E (conditional) | ci-cd-pipeline.yml | Main branch or labeled PR |
| (Main) `run-load-tests` | Locust load testing (conditional) | ci-cd-pipeline.yml | Main branch only |
| `commit-ready.yml` | Quick pre-commit validation | Standalone | Manual dispatch |
| `commit-ready-smoke.yml` | Smoke subset for pre-commit | Standalone | Manual dispatch |
| `commit-ready-cleanup-smoke.yml` | Extended smoke with cleanup | Standalone | Manual dispatch |
| `e2e-tests.yml` | Standalone E2E trigger | Standalone | Manual dispatch |
| `load-testing.yml` | Standalone load test trigger | Standalone | Manual dispatch |

**Note:** Main pipeline has test scope determination job:
- ✅ Unit tests: always on PR
- ✅ E2E tests: main branch OR `requires:e2e` label OR `[full-test]` in title
- ✅ Load tests: main branch only

---

## Dependency Graph (Critical Path)

```
1. version-verification ──┐
                          ├──→ lint-backend ──┐
2. workflow-version-policy┘                  │
                                             ├──→ test-backend ──┐
                                             │                   │
                          ┌───────────────────┘  test-frontend  ──┐
   lint-frontend ─────────┘                                      │
                                             ┌─────────────────→ smoke-tests ──┐
   secret-scan ──────────────────────────────┘                                 │
                                             ┌───────────────→ build-frontend ─┤
   security-scan-backend (parallelized)      │                                │
   security-scan-frontend (parallelized)     │              build-docker ────┤
   security-scan-docker (after build)        │                               │
                                             └──────→ consolidate-sarif ────→ staging-deploy-gate
                                                                              production-deploy-gate
                                                     └─────→ cleanup-and-docs

Note: All jobs have concurrency group: ci-cd-${{ github.ref }} (auto-cancels old runs)
```

**Parallelizable (no dependencies):**
- `secret-scan`
- `security-scan-backend`
- `security-scan-frontend`
- `backend-deps`
- `frontend-deps`

---

## Configuration Reference

### Environment Variables
```yaml
PYTHON_VERSION: '3.11'
NODE_VERSION: '24'
DOCKER_REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

### Secrets (optional, for features)
- `SLACK_WEBHOOK_URL` — Notifications
- `GHCR_TOKEN` — GitHub Container Registry push
- `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` — Docker Hub push
- `DEPLOY_HOST` — Deployment target

### Variables (optional, for features)
- `AUTO_DEPLOY_ON_PUSH` — Auto-deploy staging on main
- `STAGING_DEPLOY_ENABLED` — Enable staging deployment
- `PROD_DEPLOY_ENABLED` — Enable production deployment
- `STAGING_URL` — Staging environment URL
- `PROD_URL` — Production environment URL

---

## Quick Reference: When Does Each Workflow Run?

| Trigger | Workflows |
|---------|-----------|
| **Every push to main** | ci-cd-pipeline (full suite) |
| **Every PR to main** | ci-cd-pipeline (unit tests + linting) |
| **Push tag v1.x.x** | release-on-tag, post-deployment-monitoring |
| **Manual dispatch** | installer, docker-publish, codebase-cleanup, operator-approval |
| **Daily (8 PM)** | scheduled-production-health-check |
| **Weekly (Sunday)** | cleanup-workflow-runs, cleanup-deployments, docs-organization |
| **Nightly** | pr-hygiene, stale, dependabot-auto |
| **On Dependabot PR** | dependabot-pr-helper |
| **Monthly (1st)** | release-asset-sanitizer |
| **Quarterly** | archive-legacy-releases |

---

## Adding a New Workflow

1. **Decide on category** (use categories above as guide)
2. **Document in this file** (update relevant section)
3. **Use consistent naming:** `category-description.yml` (e.g., `security-custom-scan.yml`)
4. **Set concurrency group** if competing with main pipeline (prevent duplicate runs)
5. **Use reusable workflows** where possible (DRY principle)
6. **Test in isolated branch** before merging to main

---

## Common Troubleshooting

**Q: A workflow is stuck/not running**  
A: Check for `concurrency` groups preventing parallel runs. Use `reset-workflows.yml` if needed.

**Q: Security alerts not showing in GitHub**  
A: Ensure SARIF upload job ran successfully. Check `upload-sarif` step in security jobs.

**Q: Deployment didn't trigger**  
A: Check `staging-deploy-gate` or `production-deploy-gate` output. May be intentionally skipped if conditions not met.

**Q: Workflow takes longer than expected**  
A: Check GitHub Actions runner queue (runners may be busy). Monitor via Actions tab.

---

## Future Improvements (Roadmap)

- [ ] Extract test jobs to callable reusable workflows (`tests/`)
- [ ] Create composite actions for Python/Node/Docker setup (reduce duplication)
- [ ] Consolidate duplicate maintenance workflows
- [ ] Extract security scanning to separate reusable workflows
- [ ] Add workflow templates for new contributors
- [ ] Build workflow visualization tool
