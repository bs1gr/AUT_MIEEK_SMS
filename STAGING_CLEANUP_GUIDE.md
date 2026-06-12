# Staging Deployments Cleanup & Recovery Guide

## Overview

The staging environment had accumulated **466 failed deployments** due to:
1. Automatic deployment attempts when self-hosted runners were unavailable
2. Missing or misconfigured deployment infrastructure (Docker, network access)
3. Lack of proper error handling and recovery

## Changes Made

### 1. Disabled Automatic Deployments
**File**: `.github/workflows/ci-cd-pipeline.yml`

- **Before**: Auto-deploy on every push to `main` (when actor is `bs1gr`)
- **After**: Require explicit `workflow_dispatch` trigger

**Impact**: Prevents accumulation of failed deployments

### 2. Added Runner Availability Check
**File**: `.github/workflows/ci-cd-pipeline.yml`

New pre-flight check verifies self-hosted runner is reachable before attempting deployment.

### 3. Improved Deployment Cleanup
**File**: `.github/workflows/cleanup-deployments.yml`

**Changes**:
- Schedule changed from monthly to **weekly** (Monday 2 AM UTC)
- Default environment changed to `staging` 
- Default `keep_count` increased from 1 to 3 recent deployments
- Improved logging and status reporting

## How to Clean Up Old Deployments

### Option 1: Use GitHub CLI (Recommended)

```powershell
# List all staging deployments
gh deployment list -e staging --limit 100

# Delete old deployments manually for a specific environment
gh api repos/bs1gr/AUT_MIEEK_SMS/deployments?environment=staging \
  --jq '.[] | .id' | tail -n +4 | while read id; do
  gh api -X DELETE repos/bs1gr/AUT_MIEEK_SMS/deployments/$id
done
```

### Option 2: Use Cleanup Workflow

1. Go to **Actions** → **Cleanup Deployments**
2. Click **Run workflow**
3. Select environment: `staging`
4. Set `keep_count`: `3` (keeps 3 most recent)
5. Set `dry_run`: `true` (preview first)
6. Run and verify the preview
7. Re-run with `dry_run`: `false` to actually delete

### Option 3: Delete All and Start Fresh

```powershell
# WARNING: This deletes ALL staging deployments
gh api repos/bs1gr/AUT_MIEEK_SMS/deployments?environment=staging \
  --jq '.[].id' | while read id; do
  gh api -X DELETE repos/bs1gr/AUT_MIEEK_SMS/deployments/$id
done
```

## Manual Deployment Instructions

To deploy to staging manually:

### Via GitHub UI
1. Go to **Actions** → **CI/CD Pipeline - Student Management System**
2. Click **Run workflow**
3. Select branch: `main`
4. Set `deploy_environment`: `staging`
5. Click **Run workflow**

### Via GitHub CLI
```powershell
gh workflow run ci-cd-pipeline.yml \
  -f deploy_environment=staging \
  --ref main
```

## Staging Environment Prerequisites

Before deploying, ensure:

1. **Self-Hosted Runner Available**
   - Label: `self-hosted, windows, staging-lan`
   - Status: Online and healthy
   - Check: Settings → Runners

2. **Docker Installed**
   - Version: 20+
   - Status: Running and accessible

3. **Network Configuration**
   - Port 8080 available (or configured port)
   - Outbound access to GitHub
   - Inbound access for staging URL

4. **Environment Variables Configured**
   - `STAGING_URL`: Staging deployment endpoint
   - `DEPLOY_HOST`: Docker host (if different from runner)

## Monitoring Deployments

### View Deployment Status
```powershell
gh deployment view --environment staging
```

### View Deployment Logs
```powershell
gh run list --workflow=ci-cd-pipeline.yml --status=failure --limit=5
```

### Health Check Staging
```powershell
# After deployment succeeds
curl https://<staging-url>/health
```

## Troubleshooting Failed Deployments

### Issue: "No self-hosted runner matching the criteria"
**Solution**: 
- Verify runner is registered: `gh runner list`
- Check runner labels include `self-hosted, windows, staging-lan`
- Ensure runner is online and accepting jobs

### Issue: "Docker is not running"
**Solution**:
- SSH to runner: `ssh <staging-host>`
- Start Docker: `docker daemon` or `systemctl start docker`
- Verify: `docker ps`

### Issue: "Port 8080 already in use"
**Solution**:
- Automatic cleanup will attempt to free port
- Manual: `docker stop $(docker ps --filter "expose=8080" -q)`
- Or: Change deployment port in configuration

### Issue: "Deployment succeeds but app not responding"
**Solution**:
- Check logs: `docker logs sms-staging`
- Verify database connectivity
- Check network routing to staging URL

## Future Improvements

1. **Add Healthchecks**
   - Post-deployment endpoint verification
   - Automatic rollback on health check failure

2. **Setup Staging Runners**
   - Dedicated staging deployment runner group
   - Redundant runners for failover
   - Automatic restart on failure

3. **Implement Blue-Green Deployments**
   - Zero-downtime deployments
   - Automatic traffic switching
   - Easy rollback capability

4. **Add Notification Integration**
   - Slack notifications for deployment status
   - Email alerts on failures
   - Deployment summary reports

## References

- [GitHub Deployments API](https://docs.github.com/en/rest/reference/repos#deployments)
- [GitHub CLI Deployments](https://cli.github.com/manual/gh_deployment)
- [Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners)
