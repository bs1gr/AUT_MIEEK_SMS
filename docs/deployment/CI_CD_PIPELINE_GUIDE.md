# CI/CD Pipeline Documentation

**Version:** 1.0.0  
**Last Updated:** November 24, 2025  

---

## Overview

The Student Management System uses a comprehensive multi-stage CI/CD pipeline that automates the entire software delivery lifecycle from commit to production deployment.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: PRE-COMMIT VALIDATION                  │
│  ✓ Version Verification  ✓ Linting  ✓ Type Checking               │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 2: AUTOMATED TESTING                      │
│  ✓ Backend Tests (263 tests)  ✓ Frontend Tests  ✓ Smoke Tests     │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 3: BUILD & PACKAGE                        │
│  ✓ Frontend Build  ✓ Docker Images  ✓ Artifacts                   │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: SECURITY SCANNING                      │
│  ✓ Dependency Audit  ✓ Code Security  ✓ Container Scanning        │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 5: DEPLOYMENT                             │
│  Staging (auto) → Production (on tag) → Release Creation           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Workflows

### 1. ci-cd-pipeline.yml (Main Pipeline)

**Trigger Events:**
- Push to `main` branch
- Pull requests to `main`
- Git tags matching `v*.*.*`
- Manual dispatch with environment selection

**Duration:** ~15-20 minutes (full pipeline)

**Stages:**

#### Stage 1: Version Verification
```yaml
version-verification:
  - Validates VERSION file consistency across codebase
  - Checks 11+ files for version references
  - Generates version verification report
  - Fails on critical inconsistencies
```

**Exit Codes:**
- `0`: All versions consistent ✅
- `1`: Critical failures (blocks pipeline) ❌
- `2`: Inconsistencies found (blocks pipeline) ⚠️

#### Stage 2: Linting & Code Quality
```yaml
lint-backend:
  - Ruff linter (PEP 8 compliance)
  - MyPy type checker (static analysis)
  - Flake8 (code style)
  
lint-frontend:
  - ESLint (JavaScript/TypeScript)
  - TypeScript compiler (type checking)
```

#### Stage 3: Automated Testing
```yaml
test-backend:
  - Pytest with coverage
  - 263 backend tests
  - HTML + XML coverage reports
  - Codecov integration
  
test-frontend:
  - Vitest unit tests
  - Coverage reports
  
smoke-tests:
  - Integration testing
  - SMOKE_TEST.ps1 script
  - End-to-end validation
```

#### Stage 4: Build & Package
```yaml
build-frontend:
  - Production React build
  - Vite bundling
  - Asset optimization
  - Upload dist/ artifact
  
build-docker-images:
  - Multi-platform Docker build
  - GitHub Container Registry push
  - Automatic version tagging
  - Build cache optimization
```

**Docker Image Tags:**
- `latest` - Latest main branch
- `vX.Y.Z` - Semantic version from VERSION file
- `<branch>-<sha>` - Branch-specific builds
- `vX.Y` - Major.minor version

#### Stage 5: Security Scanning
```yaml
security-scan-backend:
  - Safety (dependency vulnerabilities)
  - Bandit (code security issues)
  
security-scan-frontend:
  - npm audit (dependency vulnerabilities)
  
security-scan-docker:
  - Trivy (container scanning)
  - SARIF upload to GitHub Security tab
```

#### Stage 6: Documentation Validation
```yaml
cleanup-and-docs:
  - Check for TODO/FIXME items
  - Find obsolete/deprecated files
  - Validate markdown links
  - Generate documentation index
```

#### Stage 7: Staging Deployment
```yaml
deploy-staging:
  - Triggers: Push to main branch
  - Environment: staging
  - Auto-deployment
  - Health checks
  - URL: https://staging.sms.example.com
```

#### Stage 8: Production Deployment
```yaml
deploy-production:
  - Triggers: Git tags (v*.*.*)
  - Environment: production
  - Pre-deployment backup
  - Manual approval required (GitHub environment protection)
  - Health validation
  - URL: https://sms.example.com
```

#### Stage 9: Release Management
```yaml
create-release:
  - Generates release notes
  - Downloads all build artifacts
  - Creates GitHub Release
  - Attaches test reports, coverage, etc.
```

#### Stage 10: Monitoring
```yaml
post-deployment-monitoring:
  - 5-minute health monitoring
  - Error rate checking
  - Performance validation
```

---

### 2. quickstart-validation.yml (Fast Pre-Commit)

**Trigger Events:**
- Push to any branch except `main`
- Pull requests to `main`

**Duration:** ~5 minutes

**Purpose:** Rapid feedback loop for developers

**Checks:**
- Version consistency (non-blocking)
- Quick backend lint (Ruff only)
- Backend tests (fail-fast)
- Frontend lint
- Frontend tests (no coverage)

---

## Integration with Automation Tools

### Version Management Integration

The pipeline integrates with the automated version management system:

```powershell
# VERIFY_VERSION.ps1 is called in version-verification job
.\scripts\VERIFY_VERSION.ps1 -CheckOnly

# Exit codes determine pipeline behavior:
# - 0: Continue (all consistent)
# - 1: Fail pipeline (critical issues)
# - 2: Fail pipeline (inconsistencies)
```

**Automatic Version Extraction:**
```yaml
- name: Extract version from VERSION file
  id: version
  run: |
    VERSION=$(cat VERSION | tr -d '[:space:]')
    echo "version=$VERSION" >> $GITHUB_OUTPUT
```

This version is used for:
- Docker image tagging
- Release creation
- Deployment metadata

### Smoke Test Integration

```powershell
# SMOKE_TEST.ps1 runs comprehensive validation
.\scripts\SMOKE_TEST.ps1

# Validates:
# - 263 backend tests
# - Database migrations
# - Health endpoints
# - Configuration consistency
```

---

## Artifacts Generated

### Test Results
- `backend-test-results/` - Pytest HTML/JSON reports
- `frontend-test-results/` - Vitest coverage
- `backend-security-reports/` - Bandit findings
- `frontend-security-reports/` - npm audit results

### Build Artifacts
- `frontend-dist/` - Production React bundle
- `frontend-build-stats/` - Vite build statistics
- `version-verification-report/` - Version consistency analysis
- `documentation-index/` - Generated docs index

### Release Assets
All artifacts are automatically attached to GitHub Releases.

---

## Environment Configuration

### Required Secrets

#### For Docker Registry (GitHub Container Registry)
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

#### For Deployments (Optional - customize based on your infrastructure)
- `PROD_USER` - Production server SSH user
- `PROD_HOST` - Production server hostname
- `STAGING_USER` - Staging server SSH user
- `STAGING_HOST` - Staging server hostname

#### For External Integrations (Optional)
- `CODECOV_TOKEN` - Codecov integration
- `SLACK_WEBHOOK` - Slack notifications
- `TEAMS_WEBHOOK` - Microsoft Teams notifications

### Environment Protection Rules

Configure in GitHub Settings → Environments:

**staging:**
- Auto-deployment on main branch push
- No manual approval required

**production:**
- Deployment on tags only
- Require manual approval from team leads
- Restrict to protected branches

---

## Usage Examples

### Standard Development Workflow

```bash
# 1. Make changes
git checkout -b feature/new-feature
# ... make code changes ...

# 2. Push to trigger quickstart validation
git push origin feature/new-feature
# ⚡ quickstart-validation.yml runs (~5 min)

# 3. Create PR
gh pr create --title "Add new feature"
# 🔄 Both quickstart + full ci-cd run

# 4. After PR approval, merge to main
gh pr merge --squash
# 🚀 Full pipeline runs, deploys to staging

# 5. Tag for production release
git tag -a v1.9.0 -m "Release v1.9.0"
git push origin v1.9.0
# 🎯 Production deployment + GitHub Release
```

### Manual Version Update Workflow

```bash
# 1. Update version
Set-Content .\VERSION "1.9.0"

# 2. Run automated version update
.\scripts\VERIFY_VERSION.ps1 -Update -Report

# 3. Commit changes
git add -A
git commit -m "chore: bump version to 1.9.0"

# 4. Push - pipeline validates version consistency
git push origin main
# ✅ version-verification job passes
```

### Manual Deployment Trigger

```bash
# Deploy to specific environment via GitHub CLI
gh workflow run ci-cd-pipeline.yml \
  --field deploy_environment=staging

# Or via GitHub UI:
# Actions → CI/CD Pipeline → Run workflow → Select environment
```

---

## Customization Guide

### Adding New Test Stages

```yaml
# Add after test-frontend job
custom-e2e-tests:
  name: 🌐 E2E Tests (Playwright)
  runs-on: ubuntu-latest
  needs: [test-frontend, test-backend]
  steps:
    - uses: actions/checkout@v4
    - name: Install Playwright
      run: cd frontend && npx playwright install
    - name: Run E2E tests
      run: cd frontend && npm run test:e2e
```

### Adding Notification Integrations

```yaml
# Add to notify-completion job
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "${{ steps.status.outputs.emoji }} Pipeline ${{ steps.status.outputs.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Pipeline:* ${{ github.workflow }}\n*Status:* ${{ steps.status.outputs.message }}\n*Commit:* ${{ github.sha }}"
            }
          }
        ]
      }
```

### Custom Deployment Scripts

Replace placeholder deployment commands:

```yaml
# In deploy-production job
- name: Deploy to production
  run: |
    # SSH deployment example
    ssh ${{ secrets.PROD_USER }}@${{ secrets.PROD_HOST }} << 'EOF'
      cd /opt/sms
      docker-compose pull
      docker-compose up -d
      docker system prune -f
    EOF
    
    # Or Kubernetes deployment
    kubectl set image deployment/sms-app \
      sms-app=${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }}
    kubectl rollout status deployment/sms-app
```

---

## Monitoring & Debugging

### Viewing Pipeline Status

```bash
# List recent workflow runs
gh run list --workflow=ci-cd-pipeline.yml

# Watch live run
gh run watch

# View logs for failed run
gh run view <run-id> --log-failed
```

### Common Issues

#### Version Verification Fails
```
❌ Version inconsistencies detected
```

**Solution:**
```powershell
.\scripts\VERIFY_VERSION.ps1 -Update
git add -A
git commit -m "fix: update version references"
```

#### Docker Build Fails
```
ERROR: failed to solve: failed to push
```

**Solution:**
- Check GITHUB_TOKEN permissions
- Verify repository has Packages enabled
- Ensure GitHub Container Registry is accessible

#### Tests Timeout
```
Error: The operation was canceled.
```

**Solution:**
- Increase timeout in workflow YAML
- Optimize slow tests
- Check for database lock issues

---

## Performance Optimization

### Pipeline Speed Improvements

1. **Cache Dependencies**
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

2. **Parallel Job Execution**
   - Tests run in parallel (backend + frontend)
   - Security scans run concurrently
   - Independent stages have no `needs:` dependencies

3. **Docker Layer Caching**
   ```yaml
   cache-from: type=gha
   cache-to: type=gha,mode=max
   ```

### Cost Optimization

- Quickstart workflow for fast feedback (5 min vs 20 min)
- Conditional jobs with `if:` statements
- Artifact retention: 7-30 days (configurable)
- Skip security scans on PRs

---

## Compliance & Audit

### Audit Trail
- All deployments logged in GitHub Actions
- Version history tracked in Git tags
- Release notes generated automatically
- Test results retained for 30 days

### Security Scanning
- Dependency vulnerabilities (Safety, npm audit)
- Code security issues (Bandit)
- Container vulnerabilities (Trivy)
- Results uploaded to GitHub Security tab

### Documentation
- Version verification reports
- Test coverage reports
- Build statistics
- Security scan results

---

## Roadmap

### Planned Enhancements

- [ ] Integration with Terraform for infrastructure as code
- [ ] Automated rollback on health check failures
- [ ] Performance testing stage (Lighthouse, k6)
- [ ] Database migration validation
- [ ] Automatic changelog generation
- [ ] Blue-green deployment support
- [ ] Canary deployment option
- [ ] Multi-region deployment

---

## Related Documentation

- **Version Automation:** `docs/VERSION_AUTOMATION_GUIDE.md`
- **Docker Deployment:** `DOCKER.ps1`, `docs/DOCKER_NAMING_CONVENTIONS.md`
- **Pre-Commit Workflow:** `PRE_COMMIT_WORKFLOW_SUMMARY.md`
- **Architecture:** `docs/ARCHITECTURE.md`

---

**Last Updated:** 2025-11-24  
**Maintained By:** SMS Development Team  
**Pipeline Version:** 1.0.0
