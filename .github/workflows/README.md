# GitHub Actions Workflows

Quick start guide for the SMS CI/CD pipeline.

---

## 🚀 What Happens When?

### On Every Push to `main`
- ✅ Version validation
- ✅ Linting (Python + JavaScript)
- ✅ Unit tests (backend + frontend)
- ✅ Security scanning (secrets, dependencies, Docker)
- ✅ Docker image build
- ✅ **Conditional:** E2E/Load tests (skipped unless full suite needed)
- ⚠️ Deployment gates evaluated (may auto-deploy if configured)

**Duration:** ~15-20 minutes  
**Status:** View in [GitHub Actions](../../actions)

### On Every Pull Request to `main`
- ✅ Version validation
- ✅ Linting (Python + JavaScript)
- ✅ Unit tests only (no E2E/load)
- ✅ Secret scanning
- ❌ No Docker build
- ❌ No deployment

**Duration:** ~8-12 minutes  
**Fast path:** True—optimized for dev feedback loop

### To Enable Full Testing on a PR
Add `requires:e2e` label **OR** include `[full-test]` in PR title.

### On Git Tag Push (v1.x.x)
- ✅ Run full ci-cd-pipeline
- ✅ Create GitHub Release
- ✅ Deploy to production (if enabled)
- ✅ Monitor health for 5 minutes

**Duration:** ~25-40 minutes  
**Risk:** Medium—affects production

### Manual Trigger (Dispatch)
Available workflows:
- `installer` — Build Windows installer
- `docker-publish` — Publish Docker image
- `codebase-cleanup` — Clean repo
- `operator-approval` — Approval workflow
- `reset-workflows` — Emergency reset

---

## 📊 Pipeline Breakdown

### Phase 1: Pre-Commit Validation
- `version-verification` — Check VERSION file format
- `workflow-version-policy` — Ensure no direct VERSION reads

### Phase 2: Linting & Code Quality
- `lint-backend` — Ruff + MyPy
- `lint-frontend` — ESLint + TypeScript
- `secret-scan` — Gitleaks

### Phase 3: Testing
- `test-backend` — pytest (with coverage)
- `test-frontend` — vitest (with coverage)
- `smoke-tests` — Server startup verification
- `run-e2e-tests` — Playwright (conditional)
- `run-load-tests` — Locust (conditional)

### Phase 4: Build & Package
- `build-frontend` — Production bundle
- `build-docker-images` — Multi-platform Docker

### Phase 5: Security Scanning
- `security-scan-backend` — pip-audit
- `security-scan-frontend` — npm-audit
- `security-scan-docker` — Trivy
- `consolidate-sarif-reports` — Unified GitHub Security tab

### Phase 6: Release Management
- `staging-deploy-gate` — Evaluate staging deployment
- `production-deploy-gate` — Evaluate production deployment
- `create-release` — GitHub Release (disabled, using release-on-tag.yml instead)

### Phase 7: Deployment
- `deploy-staging` — To staging environment
- `deploy-production` — To production environment
- `post-deployment-monitoring` — Health checks

### Phase 8: Notification
- `notify-completion` — Slack summary (if webhook configured)

---

## 🔑 Key Features

### Conditional Test Scope (Phase 4 Feature)
PRs run **unit tests only** for speed (~5 min).  
Main branch runs **full suite** including E2E/load (~20 min).

**Opt-in to full tests:**
- Add label: `requires:e2e`
- Or include in PR title: `[full-test]`

### Concurrency Control
Only one run per branch at a time. New pushes cancel old runs.

### Deployment Gates
Both staging and production have policy gates that evaluate:
- Actor (who triggered)
- Branch
- Event type (push vs. dispatch vs. workflow_call)
- Environment variables (enabled/disabled)

Deployments only proceed if gate conditions met.

### SARIF Security Reports
All security scans upload to GitHub Security tab (Code scanning):
- Backend: pip-audit (Python CVEs)
- Frontend: npm-audit (Node CVEs)
- Docker: Trivy (OS-level vulnerabilities)
- Unified: consolidated-audit-results.sarif

### Release Asset Policy
Only `release-installer-with-sha.yml` can upload release assets.  
Only `release-asset-sanitizer.yml` can delete assets.  
Prevents accidental publishing of CI artifacts (HTML reports, etc.).

---

## 📁 Organization

6 categories:
1. **Core CI/CD** — Main orchestrator + version checks
2. **Build & Publish** — Docker, installer, dependencies
3. **Security** — Scanning, auditing, SARIF consolidation
4. **Release & Deploy** — Tags, releases, deployments
5. **Maintenance** — Cleanup, hygiene, monitoring
6. **Testing** — Unit, integration, E2E, load (mostly embedded in main)

**Full breakdown:** See [ORGANIZATION.md](./ORGANIZATION.md)

---

## ⚙️ Configuration

### Required (for basic operation)
- `./.github/workflows/` directory exists ✅
- `./VERSION` file with v1.x.x format ✅
- `backend/requirements.txt` ✅
- `frontend/package.json` ✅
- `Dockerfile.fullstack` ✅

### Optional (for features)

#### Slack Notifications
Add secret: `SLACK_WEBHOOK_URL`

#### Docker Registry Push
Add secret: `GHCR_TOKEN` (GitHub Container Registry)  
Or: `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN`

#### Deployments
Add variables to environment `staging` or `production`:
- `STAGING_DEPLOY_ENABLED` / `PROD_DEPLOY_ENABLED` (true/false)
- `STAGING_URL` / `PROD_URL` (e.g., https://sms-staging.example.com)
- `DEPLOY_HOST` (hostname, if no URL set)

And register self-hosted runners with labels:
- `self-hosted, windows, staging-lan`
- `self-hosted, windows, production-lan`

---

## 🛠️ Common Tasks

### Run Full Tests on a PR
```bash
# Option 1: Add label
gh pr edit <PR#> --add-label requires:e2e

# Option 2: Update PR title
# Include [full-test] somewhere in title
git commit --amend -m "feat: [full-test] my feature"
git push -f
```

### Manually Build Docker Image
```bash
# Trigger docker-publish workflow
gh workflow run docker-publish.yml -f tag=v1.18.24
```

### Manually Build Installer
```bash
# Trigger installer workflow
gh workflow run installer.yml
```

### Deploy to Staging
```bash
# Option 1: Auto-deploy on push to main (if enabled)
git push origin main

# Option 2: Manual trigger
gh workflow run ci-cd-pipeline.yml \
  -f deploy_environment=staging
```

### Check Workflow Status
```bash
# List recent runs
gh workflow list

# Watch a specific run
gh run watch <RUN_ID>

# View run details
gh run view <RUN_ID> --log
```

---

## 🚨 Troubleshooting

### Workflow Won't Start
- Check if previous run is still in progress (concurrency)
- Manually cancel old runs: `gh run cancel <OLD_RUN_ID>`
- Emergency reset: trigger `reset-workflows` (manual dispatch)

### Test Failures
- Run `commit-ready.yml` locally for quick validation
- Check test artifacts: Actions tab → Run → Artifacts

### Deployment Stuck
- Check gate job output: `staging-deploy-gate` or `production-deploy-gate`
- Verify self-hosted runner is online: `gh runner list`
- Check runner logs on deployment machine

### Security Scan Not Showing
- Wait for `consolidate-sarif-reports` to finish
- Check GitHub Security tab (not Code scanning initially)
- Verify SARIF file is valid JSON

### Docker Build Failed
- Check if Docker daemon is running on runner
- Verify Dockerfile.fullstack path is correct
- Check build cache: `docker system prune`

---

## 📚 Resources

| Resource | Purpose |
|----------|---------|
| [ORGANIZATION.md](./ORGANIZATION.md) | Complete workflow reference |
| [GitHub Actions docs](https://docs.github.com/en/actions) | Official reference |
| [Main pipeline](./ci-cd-pipeline.yml) | 2,300 lines; see comments |
| [VERSION file](../../VERSION) | Current version (v1.x.x) |
| [Release docs](../../docs/releases) | Release procedures |

---

## ✅ Checklist: Adding a New Workflow

- [ ] Created workflow file: `.github/workflows/my-workflow.yml`
- [ ] Documented in ORGANIZATION.md
- [ ] Set concurrency group (if needed)
- [ ] Tested on isolated branch
- [ ] Added to README.md (if frequently used)
- [ ] No hardcoded secrets (use ${{ secrets.* }})
- [ ] Appropriate permissions set
- [ ] Added helpful comments

---

## 🎯 Support

**Questions?**
1. Check [ORGANIZATION.md](./ORGANIZATION.md) (detailed reference)
2. Search workflow files for similar patterns
3. Check GitHub Actions documentation
4. Review recent run logs in Actions tab

**Found a bug?**
- Report in Issues with workflow name + run ID
- Attach relevant logs/artifacts
- Include reproduction steps

---

**Last updated:** June 5, 2026  
**Status:** All 37 workflows operational, optimized  
**Next:** Phase 2 consolidations (Phase 2-3 dates TBD)
