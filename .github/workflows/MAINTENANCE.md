# CI/CD Maintenance Procedures

Operational guide for managing the SMS CI/CD pipeline.

---

## 📋 Daily Checks

**Schedule:** Start of day / before merging to main

- [ ] Check [GitHub Actions](../../actions) for failed runs
- [ ] Review security alerts (Code scanning tab)
- [ ] Verify no stale branches blocking deployment
- [ ] Confirm staging/production runners are online

**Commands:**
```bash
# Check for failed runs
gh run list --status failed --limit 10

# Check runner status
gh runner list

# View security alerts
gh api repos/{owner}/{repo}/code-scanning/alerts
```

---

## 🔄 Weekly Maintenance

**Schedule:** Every Sunday (or as needed)

### 1. Cleanup Old Runs
```bash
# Manually trigger cleanup (usually runs auto)
gh workflow run cleanup-workflow-runs.yml
```
**What it does:**
- Deletes workflow runs older than 90 days
- Frees GitHub Actions storage quota
- Does NOT delete artifacts (those have 30-day retention)

### 2. Cleanup Old Deployments
```bash
gh workflow run cleanup-deployments.yml
```
**What it does:**
- Removes deployment history > 90 days
- Keeps environment history clean
- Safe—non-destructive

### 3. Documentation Update
```bash
gh workflow run docs-organization.yml
```
**What it does:**
- Regenerates documentation index
- Validates markdown links (local)
- Organizes docs/ structure

### 4. Review Dependency Updates
```bash
# Check Dependabot PRs
gh pr list --search "author:dependabot"

# Auto-merge safe updates (minor versions)
gh workflow run dependabot-auto.yml
```
**What it does:**
- Auto-merges patch/minor version updates
- Requires tests to pass first
- Manual review for major versions

---

## 🚨 Emergency Procedures

### Workflow Stuck / Infinite Loop
```bash
# Option 1: Cancel specific run
gh run cancel <RUN_ID>

# Option 2: Emergency reset (clears workflow state)
gh workflow run reset-workflows.yml
```

### Force Cancel All Runs on Branch
```bash
gh run list --branch main --status in_progress --json databaseId -q '.[] | .databaseId' | xargs -I {} gh run cancel {}
```

### Revert Last Commit (if breaking change)
```bash
git revert HEAD
git push origin main
```

### Manual Security Scan
```bash
# Run CodeQL manually
gh workflow run codeql.yml

# Run Trivy manually
gh workflow run trivy-scan.yml
```

---

## 🔐 Security Maintenance

**Monthly review:**
- [ ] Check GitHub Security tab (Code scanning alerts)
- [ ] Review SARIF reports for false positives
- [ ] Update security policy in `.github/SECURITY.md`
- [ ] Review branch protection rules

**Quarterly audit:**
- [ ] Review stored secrets (no hardcoded creds exposed?)
- [ ] Audit self-hosted runner access
- [ ] Review deployment permissions
- [ ] Check release asset integrity

---

## 📦 Release Management

### Before Tagging Release
```bash
# Ensure main is clean
git status
git pull origin main

# Verify VERSION file format
cat VERSION  # Should be: v1.x.x (e.g., v1.18.24)

# Run quick smoke test
gh run watch $(gh workflow run ci-cd-pipeline.yml --ref main --json databaseId -q '.[] | .databaseId')
```

### Create Release
```bash
# Tag commit
git tag -a v1.18.25 -m "Release v1.18.25"
git push origin v1.18.25

# This automatically:
# 1. Runs full ci-cd-pipeline
# 2. Creates GitHub Release (via release-on-tag.yml)
# 3. Triggers post-deployment-monitoring
# 4. Deploys to production (if enabled)
```

### Monitor Release
```bash
# Watch release workflow
gh run list --workflow release-on-tag.yml --limit 1

# Check if health monitoring passed
gh run list --workflow ci-cd-pipeline.yml --limit 1 --status in_progress
```

### Rollback Release
```bash
# If release has critical bug:
# 1. Fix the bug
# 2. Create new patch version (v1.18.26)
# 3. Tag and push new version

git tag -a v1.18.26 -m "Hotfix: critical issue"
git push origin v1.18.26

# Old release remains in GitHub Releases
# Can be marked as "pre-release" if needed
gh release edit v1.18.25 --prerelease
```

---

## 🐳 Docker Image Management

### Manual Publish
```bash
# Publish specific tag
gh workflow run docker-publish.yml -f tag=v1.18.24

# Checks:
# - Builds multi-platform image
# - Pushes to GHCR (ghcr.io/...)
# - Optionally Docker Hub
# - Tags as 'latest' on default branch
```

### Check Image Status
```bash
# List available images
gh api repos/{owner}/{repo}/packages --jq '.[] | select(.package_type == "docker")'

# Check image tags
docker pull ghcr.io/{owner}/{repo}:latest
docker inspect ghcr.io/{owner}/{repo}:latest
```

### Cleanup Old Images
```bash
# GitHub automatically deletes untagged images after 90 days
# Manual cleanup not usually needed

# List images
gh api repos/{owner}/{repo}/packages
```

---

## 🏗️ Installer Build & Publishing

### Build Installer
```bash
# Trigger installer workflow (takes ~5-10 min)
gh workflow run installer.yml
```

**Output:**
- `SMS_Installer_v1.18.24.exe` (92.96 MB)
- Located in release or artifact storage

### Upload to Release
```bash
# Trigger release-installer-with-sha.yml
gh workflow run release-installer-with-sha.yml

# Adds to GitHub Release:
# - SMS_Installer_v*.exe
# - SHA256.txt (hash for verification)
```

### Verify Installer
```bash
# Download and check integrity
gh release download v1.18.24
sha256sum -c SHA256.txt
```

---

## 🧹 Cleanup Tasks

### Remove Workflow Run Logs (Manual)
```bash
# Keep workspace clean; GitHub auto-deletes after 90 days
# Manual delete if urgent:
gh run delete <RUN_ID>
```

### Clean Build Artifacts
```bash
# Remove cached artifacts locally
rm -rf frontend/dist backend/dist docker/*.tar

# Trigger CI cleanup
gh workflow run codebase-cleanup.yml
```

### Archive Old Releases
```bash
# Quarterly: archive releases to docs/releases/archive
gh workflow run archive-legacy-releases.yml
```

---

## 🔍 Monitoring & Alerts

### Set Up Health Check Notifications
```bash
# Configure Slack webhook in repository secrets:
# Settings → Secrets → SLACK_WEBHOOK_URL

# Main pipeline will post completion status
# Including pass/fail, which jobs ran, etc.
```

### Monitor Production
```bash
# Check production health every night (8 PM)
# Workflow: scheduled-production-health-check.yml
# Checks: /health endpoint, response time, status code

# View latest health check
gh run list --workflow scheduled-production-health-check.yml --limit 1
```

### Track Deployment History
```bash
# See all deployments
gh deployment list

# See production deployments
gh deployment list --environment production

# Check deployment status
gh deployment view <DEPLOYMENT_ID> --environment production
```

---

## 📊 Performance Tuning

### Reduce Pipeline Duration
Current optimizations (Phase 4):
- ✅ Conditional test scope (skip E2E/load on PR)
- ✅ Parallel security scans
- ✅ GitHub Actions cache (Python, Node, Playwright)
- ✅ Docker layer caching

**Future optimizations:**
- [ ] Extract test jobs to reusable workflows (avoid redundant setups)
- [ ] Matrix builds for multi-platform Docker images
- [ ] Incremental testing (only test changed modules)

### Check Pipeline Duration
```bash
# Get stats for last 10 runs
gh run list --limit 10 --json name,durationMinutes -q \
  '.[] | "\(.name): \(.durationMinutes) min"'
```

---

## 🔄 Updating Workflows

### Safe Workflow Update Procedure
1. **Branch:** Create feature branch: `chore/ci-update-xyz`
2. **Modify:** Update workflow file
3. **Test:** Trigger manually on test branch
4. **Review:** Get approval via PR
5. **Merge:** Merge to main (takes effect immediately)
6. **Monitor:** Watch next run for issues

### Avoid Common Mistakes
- ❌ Don't remove `needs:` dependencies (breaks pipeline)
- ❌ Don't change job IDs (output references break)
- ❌ Don't hardcode secrets (use ${{ secrets.* }})
- ❌ Don't remove version validation (critical safeguard)

---

## 📚 Documentation

### Update ORGANIZATION.md
When adding/removing/modifying workflows:
```bash
# Edit .github/workflows/ORGANIZATION.md
# Update relevant category section
# Add to dependency graph if needed
```

### Update README.md
When changing user-facing behavior:
```bash
# Edit .github/workflows/README.md
# Update "What Happens When?" section
# Update Configuration section if needed
```

---

## 🎓 Training & Onboarding

### New Team Member Checklist
- [ ] Read [README.md](./README.md) (quick start)
- [ ] Read [ORGANIZATION.md](./ORGANIZATION.md) (detailed reference)
- [ ] Run `commit-ready.yml` locally
- [ ] Trigger test PR with `requires:e2e` label
- [ ] Observe full test suite run
- [ ] Review own recent run logs

### Common Questions
- **Q: How do I skip a test?**  
  A: You don't—all tests must pass. If test is flaky, fix root cause.

- **Q: How do I deploy to staging?**  
  A: Push to main (if auto-deploy enabled) or manual trigger via `ci-cd-pipeline.yml`.

- **Q: How do I speed up my PR?**  
  A: Unit tests run fast (~5 min). Avoid `[full-test]` unless needed.

- **Q: How do I see why a job failed?**  
  A: Actions tab → Run → Job → View logs. Download artifacts if needed.

---

## 📞 Support

**Need help?**
1. Check workflow comments (many have detailed notes)
2. Review recent successful runs for comparison
3. Check GitHub Actions documentation
4. Ask in team Slack/chat

**Report issues:**
- Create GitHub Issue with:
  - Workflow name
  - Run ID
  - Error message
  - Reproduction steps

---

**Last updated:** June 5, 2026  
**Maintainer:** DevOps Team  
**Contact:** See SECURITY.md for reporting procedures
