# CI/CD Deployment Checklist

**Purpose:** Verify all fixes are working before confirming production readiness  
**Estimated Time:** 30-45 minutes  
**Frequency:** After each major update  
**Last Updated:** 2026-06-07

---

## Pre-Deployment Checklist

### Configuration & Secrets

- [ ] **CODESIGN_CERT_THUMBPRINT secret is set**
  - Location: Settings → Secrets and variables → Actions
  - Value matches your certificate thumbprint
  - Test: Try a release build

- [ ] **SLACK_WEBHOOK_URL is set (optional)**
  - Location: Same as above
  - Webhook points to correct Slack channel
  - Test: Run pipeline and check for notification

- [ ] **GITHUB_TOKEN permissions reviewed**
  - Verify in Settings → Actions → General
  - Confirm appropriate scope
  - No unnecessary permissions granted

- [ ] **All required files exist**
  - [ ] VERSION file (format: v1.x.x)
  - [ ] .gitleaks.toml (Gitleaks config)
  - [ ] requirements.txt (Backend dependencies)
  - [ ] package.json (Frontend)
  - [ ] package-lock.json (Frontend lock file)

### Code Review

- [ ] **All fixes have been reviewed**
  - [ ] a211cd52b - CRITICAL fixes
  - [ ] 047c1e6cc - HIGH fixes
  - [ ] b7ff57a7e - MEDIUM fixes
  - [ ] 31218cb67 - LOW fixes
  - [ ] b806b5672 - Slack & deploy scaffold
  - [ ] 72a4407ff - Documentation
  - [ ] cc9827cb2 - Standards guide
  - [ ] 73a36e902 - Index

- [ ] **Documentation has been read**
  - [ ] At least one team member read CI-CD-QUICK-REFERENCE.md
  - [ ] DevOps team familiar with PHASE-2-IMPLEMENTATION-PLAN.md
  - [ ] Standards documented in CI-CD-STANDARDS.md

---

## Local Testing

### Test Each Fixed Component

**CRITICAL Fix #1: Removed disabled create-release job**
- [ ] Run `git log --oneline | grep "disabled job"`
- [ ] Verify no `if: ${{ false }}` jobs in ci-cd-pipeline.yml
- [ ] Confirm notify-completion doesn't reference create-release

**CRITICAL Fix #2: PowerShell syntax**
- [ ] Search: `echo >> $env:GITHUB_OUTPUT` (should be 0 results)
- [ ] All GITHUB_OUTPUT writes use `Out-File` pattern
- [ ] PowerShell scripts properly tested locally

**CRITICAL Fix #3: Certificate secret**
- [ ] Verify `secrets.CODESIGN_CERT_THUMBPRINT` is used
- [ ] No hardcoded thumbprints in workflow files
- [ ] Error message clear if secret missing

**HIGH Fix #1: DB migrations**
- [ ] Run: `python -c "from backend.run_migrations import run_migrations; result = run_migrations(); exit(0 if result else 1)"`
- [ ] Verify migration script returns proper exit code
- [ ] E2E tests fail on migration failure

**HIGH Fix #2: Load testing paths**
- [ ] Verify `load-testing/` directory exists
- [ ] No references to `archive/cleanup-feb2026/` paths
- [ ] Load test timeout is set to 30 minutes

**HIGH Fix #3: Health check validation**
- [ ] Health endpoint returns HTTP 200 + valid JSON
- [ ] Test with invalid endpoint (should fail)
- [ ] Check both status code AND JSON content

**MEDIUM Fix #1: continue-on-error logic**
- [ ] Main branch: continue-on-error should fail
- [ ] Feature branch: continue-on-error should allow skip
- [ ] Formula: `${{ github.ref != 'refs/heads/main' && github.event_name == 'pull_request' }}`

**MEDIUM Fix #2: Docker push logic**
- [ ] Release tags (v1.*): Always push
- [ ] Main branch: Push only if GHCR_TOKEN set
- [ ] PRs: Never push
- [ ] Logic clear in comments

**MEDIUM Fix #3: Build stats**
- [ ] frontend/.vite/stats.json exists after build
- [ ] Step has `if-no-files-found: error`
- [ ] Build fails if stats missing

**LOW Fix #1: Gitleaks integrity**
- [ ] Download includes checksum verification
- [ ] SHA256 validation prevents tampering
- [ ] Error if checksum doesn't match

**LOW Fix #2: Trivy on PRs**
- [ ] Trivy scans run on PRs (not just main)
- [ ] Non-blocking on PRs (continue-on-error: true)
- [ ] Blocking on main/releases (continue-on-error: false)

**LOW Fix #3: Mandatory version script**
- [ ] VERIFY_VERSION.ps1 must exist
- [ ] Clear error if script missing
- [ ] No fallback to COMMIT_READY.ps1

---

## CI/CD Pipeline Testing

### Run Test Workflows

**Quick validation (10 minutes):**
```bash
# Test on feature branch
git checkout -b test/ci-validation

# Push to trigger CI (minimal scope)
git push origin test/ci-validation

# Monitor: GitHub Actions → latest run
# Verify: Unit tests pass, no surprises
```

**Specific job testing (20 minutes):**

- [ ] **Version Verification Job**
  - Runs first
  - Should pass with correct VERSION file
  - Should fail with invalid format

- [ ] **Linting Jobs**
  - Backend: `ruff check`
  - Frontend: `eslint`
  - Both should pass

- [ ] **Test Jobs**
  - Backend: `pytest`
  - Frontend: `vitest`
  - Both should pass

- [ ] **Security Scanning**
  - Gitleaks: Scans for secrets
  - Trivy: Scans Dockerfiles
  - Both should complete (warnings OK)

**Full pipeline test (45 minutes):**

```bash
# Create release tag on feature branch
git tag v1.18.25-test

# Push tag to trigger release workflow
git push origin v1.18.25-test

# Monitor full pipeline
# Verify all stages pass:
# - Version check
# - Linting
# - Testing
# - Security scanning
# - Build Docker images
# - Deployment preparation

# Clean up test tag
git tag -d v1.18.25-test
git push origin :v1.18.25-test
```

---

## Verification Tests

### Test Each Configuration

**Test CODESIGN_CERT_THUMBPRINT:**
```powershell
# If you have test cert
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object {$_.Thumbprint -eq $CONFIGURED_THUMBPRINT}
Write-Host "Cert found: $($cert.Subject)"
```

**Test SLACK_WEBHOOK_URL (optional):**
```bash
# Send test message to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"CI/CD test: Pipeline is working"}' \
  $SLACK_WEBHOOK_URL
```

**Test VERSION file:**
```bash
cat VERSION  # Should output: v1.18.24
```

---

## Deployment Testing

### Staging Environment

**Option 1: Manual deployment**
```bash
# Deploy to staging manually
git tag v1.18.25-staging
git push origin v1.18.25-staging

# Verify:
# - Pipeline completes
# - Staging deployment succeeds
# - Application is accessible
# - Health checks pass
```

**Option 2: Monitor actual release**
```bash
# Create actual release
git tag v1.18.25
git push origin v1.18.25

# Watch pipeline:
# - All stages should pass
# - Release job should succeed
# - Artifacts should upload
```

### Post-Deployment Verification

After deployment, verify:

- [ ] **Application is running**
  - [ ] Health endpoint returns 200
  - [ ] API endpoints respond
  - [ ] Frontend loads correctly

- [ ] **No errors in logs**
  - [ ] Check application logs
  - [ ] Check deployment logs
  - [ ] No unexpected warnings

- [ ] **Notifications work (if enabled)**
  - [ ] Slack notification received
  - [ ] Message shows correct status
  - [ ] Links are clickable

- [ ] **Version matches**
  - [ ] Application reports correct version
  - [ ] Database is at correct schema version
  - [ ] All components aligned

---

## Rollback Procedure

**If something breaks:**

```bash
# Step 1: Identify the problem
# Check application logs for errors
# Check pipeline logs for failures

# Step 2: Revert to previous version
git log --oneline | head -5
git revert <commit-hash>

# Step 3: Push fix
git push origin main

# Step 4: Redeploy
git tag v1.18.26-hotfix
git push origin v1.18.26-hotfix

# Step 5: Verify
# Monitor new deployment
# Confirm application working
```

---

## Sign-Off Checklist

**For Project Manager:**
- [ ] All fixes verified working
- [ ] No regressions detected
- [ ] Documentation reviewed
- [ ] Team trained on changes
- [ ] Ready for production

**For DevOps Lead:**
- [ ] Secrets properly configured
- [ ] Workflow changes tested
- [ ] Security improvements verified
- [ ] Performance impact assessed
- [ ] Rollback plan understood

**For Security Lead:**
- [ ] Hardcoded secrets removed
- [ ] Tool integrity verified
- [ ] Permissions minimized
- [ ] No secrets in logs
- [ ] Compliance requirements met

**For Team Lead:**
- [ ] Team familiar with changes
- [ ] Standards understood
- [ ] Questions answered
- [ ] Support plan in place
- [ ] Ready to proceed

---

## Go/No-Go Decision

### Green Light Conditions (Go to Production)

✅ All checklist items complete  
✅ No regressions detected  
✅ Security improvements verified  
✅ Team trained and ready  
✅ Rollback plan understood  

### Red Light Conditions (Hold for Investigation)

🔴 Any checklist item fails  
🔴 Unexpected behavior detected  
🔴 Security concerns raised  
🔴 Performance degradation  
🔴 Team not ready  

---

## Common Issues & Solutions

### Issue: Secret not found error

**Symptom:** "CODESIGN_CERT_THUMBPRINT secret is not configured"

**Solution:**
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CODESIGN_CERT_THUMBPRINT`
4. Value: Your certificate thumbprint
5. Click "Add secret"
6. Re-run workflow

### Issue: Version file format error

**Symptom:** "Invalid version format. Required format: v1.x.x"

**Solution:**
1. Check VERSION file: `cat VERSION`
2. Format must be exactly: `v1.18.24` (with 'v' prefix)
3. No extra spaces or lines
4. Fix if needed: `echo "v1.18.24" > VERSION`

### Issue: Build fails with "Docker not running"

**Symptom:** Windows runner can't run Docker

**Solution:**
1. Verify Docker Desktop is installed on runner
2. Ensure Docker service is running
3. Check PATH includes Docker bin directory
4. Restart Docker if needed

### Issue: Health check timeout

**Symptom:** "Application failed to start within timeout"

**Solution:**
1. Check application logs
2. Verify database connection
3. Check port availability
4. Increase timeout if needed

---

## Testing Artifacts

### What to Keep

- [ ] Test run logs (30 days minimum)
- [ ] Error screenshots (if any)
- [ ] Performance metrics (if captured)
- [ ] Security scan results

### What to Share

- [ ] Go/No-Go decision
- [ ] Test results summary
- [ ] Any issues encountered
- [ ] Recommendations

---

## Final Approval Sign-Off

```
Checklist Completed By: _________________ Date: _______

Verified By: _________________ Date: _______

Approved For Production: ☐ YES ☐ NO

Issues Found: _________________ 

Resolution: _________________

Comments: _________________
```

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor application logs every 30 minutes
- [ ] Check error rates (should be normal)
- [ ] Verify all features working
- [ ] Monitor resource usage
- [ ] Check user feedback

### First Week

- [ ] Daily monitoring for issues
- [ ] Weekly metrics review
- [ ] User feedback collection
- [ ] Performance tracking
- [ ] Security alert monitoring

### Monthly Review

- [ ] Analyze pipeline metrics
- [ ] Review test coverage
- [ ] Assess improvement impact
- [ ] Plan next optimizations
- [ ] Update documentation if needed

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-06-07  
**Next Review:** 2026-06-21 (after first production deployment)
