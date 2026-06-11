# CI/CD Quick Reference Guide

**For:** Development & DevOps Teams  
**Version:** v1.18.24  
**Last Updated:** 2026-06-07

---

## 🚀 Quick Start

### What Changed?
- ✅ 15 CI/CD issues fixed
- ✅ Zero breaking changes
- ✅ Better error visibility
- ✅ More secure configuration

### Do I Need to Do Anything?
**Probably not.** But check if you're doing releases:
- If you do releases: **Set CODESIGN_CERT_THUMBPRINT secret**
- If you configure Slack: Optional (Slack notifications)
- Everyone else: No action needed

---

## 🔐 Configuration

### REQUIRED: Code Signing Certificate

**For:** Release automation  
**Do this:** Set repository secret

```
Setting → Secrets and variables → Actions → New repository secret

Name:  CODESIGN_CERT_THUMBPRINT
Value: [Your certificate thumbprint]
```

**Example:** `2693C1B15C8A8E5E45614308489DC6F4268B075D`

**Why:** Windows installer needs to be signed. Without this, releases will fail.

### OPTIONAL: Slack Notifications

**For:** Pipeline status notifications  
**Do this:** Set repository secret

```
Name:  SLACK_WEBHOOK_URL
Value: [Your Slack incoming webhook URL]
```

**If not set:** Pipeline still works fine, you just won't get Slack notifications

---

## 📊 Workflow Overview

### Main Pipeline (ci-cd-pipeline.yml)

```
Checkout → Lint → Test → Build → Security Scan → Deploy → Notify
```

**Key stages:**
1. **Version Verification** (5 min) - Ensures VERSION file consistency
2. **Linting** (10 min) - Code quality checks
3. **Testing** (15 min) - Unit & integration tests
4. **Security** (10 min) - Gitleaks, pip-audit, npm-audit
5. **Build** (10 min) - Frontend, Docker image
6. **Deploy** (20 min) - Staging & production
7. **Notify** (1 min) - Slack notification

**Total:** ~70 minutes (depending on test scope)

### Test Scope Logic

**On main branch:** Run all tests (E2E, load)  
**On PR:** Run unit tests only (unless labeled or [full-test] in title)

**To force full tests on PR:**
```
Option 1: Add [full-test] to PR title
Option 2: Add 'requires:e2e' label to PR
```

---

## 🧪 Test Workflows

### E2E Tests (e2e-tests.yml)
- **Runs on:** Main branch OR manual trigger OR [full-test] PR
- **Duration:** 15-20 minutes
- **Outputs:** Test results, screenshots
- **Artifacts:** Playwright trace, screenshots (if failed)

### Load Testing (load-testing.yml)
- **Runs on:** Manual workflow_dispatch only
- **Duration:** Depends on input (default 5 min)
- **Users:** Configurable (default 100)
- **Environment:** Staging or production

---

## 🔍 Monitoring & Troubleshooting

### Pipeline Failed?

**Step 1: Check the logs**
- Click the failed job in GitHub Actions
- Scroll to the failed step
- Look for clear error message

**Common failures:**
| Error | Cause | Fix |
|-------|-------|-----|
| `Version file not found` | Stale checkout | Merge main first |
| `Database migration failed` | Migration issue | Fix migration & retry |
| `Docker push failed` | Token not set | Set GHCR_TOKEN secret |
| `Health check timeout` | App crashed | Check app logs |

**Step 2: Re-run**
- Click "Re-run failed jobs" button
- Wait for next run

**Step 3: Escalate**
- If fails again, check recent changes
- Review git log for suspicious commits
- Post in #devops Slack channel

### How to Read Job Output

**Format:**
```
🔵 [Job name starting...]
  ✅ [Step succeeded]
  ❌ [Step failed - reason]
  ⚠️  [Warning - non-fatal]
```

**Good output:**
```
🔵 Build Frontend
  ✅ Setup Node.js
  ✅ Install dependencies
  ✅ Run build
  ✅ Upload artifact
```

**Bad output:**
```
🔵 Deploy to Staging
  ✅ Checkout
  ❌ Docker is running - ERROR: Docker failed to start
```

---

## 🚀 Deployment Workflow

### Manual Release

**Step 1: Tag commit**
```bash
git tag v1.18.25
git push origin v1.18.25
```

**Step 2: Wait for CI**
- GitHub Actions runs automatically
- Takes ~70 minutes
- Deploys to staging first, then production (with approval)

**Step 3: Verify**
- Check staging deployment
- Approve production in GitHub UI
- Monitor production metrics

### Rollback

**If something goes wrong:**
```bash
# Revert to previous version
git tag -d v1.18.25
git push origin :v1.18.25
git revert HEAD
git push origin main
```

---

## 📋 What Got Fixed in Phase 1

### Security Fixes
- ✅ Hardcoded secrets removed
- ✅ Tool integrity verification added
- ✅ Vulnerability scanning on PRs enabled

### Reliability Fixes
- ✅ Silent failures now detected
- ✅ Better error messages
- ✅ Health checks validate HTTP status
- ✅ Jobs have timeouts

### Visibility Fixes
- ✅ Build metrics tracked
- ✅ Slack notifications working
- ✅ Clear diagnostic messages

---

## 🔄 What's Coming in Phase 2

**Q3 2026:**
- Simplified deployment workflows (less code duplication)
- Improved security auditing
- Faster E2E tests (Playwright cache optimization)

**Q4 2026:**
- Advanced monitoring & alerting
- Performance dashboards
- Automated rollback procedures

---

## 📚 Documentation

| Document | What's Inside | For Whom |
|----------|---------------|----------|
| CI-CD-COMPLETE-SUMMARY.md | Executive overview | Decision makers |
| CI-CD-AUDIT-FIXES.md | Detailed findings | Engineers |
| PHASE-2-IMPLEMENTATION-PLAN.md | Next steps | DevOps team |
| This document | Quick reference | Everyone |

---

## 🆘 Getting Help

### Common Questions

**Q: My PR failed on E2E tests. What do I do?**  
A: Check the logs for specific error. Usually either:
1. Test needs to be updated (page structure changed)
2. Backend issue (check backend tests)
3. Flaky test (re-run and see if it passes)

**Q: How do I skip CI checks?**  
A: You can't (by design). All PRs must pass checks to merge.

**Q: Can I push directly to main?**  
A: No, main is protected. You must use PR workflow.

**Q: How long does the full test suite take?**  
A: ~70 minutes. Unit tests only are ~15 minutes.

**Q: Where are the test logs?**  
A: GitHub Actions → [Workflow run] → [Job name] → Scroll down

### Still Stuck?

1. Check the troubleshooting section above
2. Review the full audit report (CI-CD-AUDIT-FIXES.md)
3. Ask in #devops Slack
4. Open an issue on GitHub

---

## 🎯 Key Numbers

| Metric | Value |
|--------|-------|
| Workflows | 37 |
| Issues found | 23 |
| Issues fixed | 15 |
| Production ready | ✅ Yes |
| Breaking changes | 0 |
| Required actions | 1 (set secret) |
| Estimated Phase 2 | 2-3 weeks |

---

## ✅ Verification Checklist

Before you start using the updated CI/CD:

- [ ] I've read this quick reference
- [ ] I understand what changed
- [ ] I've set CODESIGN_CERT_THUMBPRINT (if doing releases)
- [ ] I've set SLACK_WEBHOOK_URL (optional, if using Slack)
- [ ] I understand test scope logic
- [ ] I know how to read pipeline logs
- [ ] I know who to contact if stuck

---

**Need more details?** Read CI-CD-AUDIT-FIXES.md  
**Planning Phase 2?** Read PHASE-2-IMPLEMENTATION-PLAN.md  
**Full audit?** Read CI-CD-COMPLETE-SUMMARY.md

---

Last updated: 2026-06-07  
Questions? Ask in #devops or #engineering Slack
