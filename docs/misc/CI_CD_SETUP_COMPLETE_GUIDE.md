# CI/CD Setup - Complete Implementation Guide

**January 25, 2026**

---

## Overview

This guide provides step-by-step instructions to complete the CI/CD setup. All actions are organized by timeline and complexity.

---

## 🚀 THIS HOUR - Setup Slack Notifications (15 minutes)

### Step 1: Create Slack Incoming Webhook

**Prerequisites**: Admin access to your Slack workspace

1. Go to your Slack workspace
2. Navigate to: **Workspace Settings** → **Manage Apps** (or click the Apps button)
3. Search for **"Incoming Webhooks"** or go to:
   ```
   https://api.slack.com/apps/create
   → Select "Incoming Webhooks"
   ```

4. Click **"Create New App"** or **"Add New Webhook to Workspace"**

5. **Configure the webhook**:
   - **App Name**: `SMS Pipeline`
   - **Posting to Channel**: Select the channel where you want notifications

     (e.g., `#deployments`, `#pipeline`, `#alerts`)
   - Click **"Add New Webhook to Workspace"**

6. **Copy the Webhook URL** (looks like):
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
   ⚠️ Keep this URL secret! Anyone with this URL can post to your Slack channel.

### Step 2: Add Webhook URL to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/bs1gr/AUT_MIEEK_SMS`

2. Navigate to **Settings** → **Secrets and variables** → **Actions**

3. Click **"New repository secret"**

4. **Create the secret**:
   - **Name**: `SLACK_WEBHOOK_URL` (EXACT - case sensitive)
   - **Value**: Paste the webhook URL from Step 1
   - Click **"Add secret"**

5. **Verify** the secret appears in the list (value will be masked)

### Step 3: Test Slack Integration

The first time the pipeline runs (any commit), you should receive a Slack notification with:
- ✅ Pipeline status (success/failure)
- ✅ Branch name (main, develop, etc.)
- ✅ Commit hash and message
- ✅ Trigger type (push, PR, tag, etc.)
- ✅ Link to the full pipeline run

---

## 🔑 TODAY - Setup SSH Deployment Key (45 minutes)

### Step 1: Generate SSH Key Pair

Run this command on your local machine (Windows PowerShell or Unix terminal):

```bash
# Generate ED25519 key (modern, secure)

ssh-keygen -t ed25519 -f deploy_key -N ""

# Or if ED25519 not supported, use RSA:

# ssh-keygen -t rsa -b 4096 -f deploy_key -N ""

# This creates two files:

# - deploy_key (PRIVATE - keep secret!)
# - deploy_key.pub (PUBLIC - share with servers)

```text
### Step 2: Add Private Key to GitHub Secrets

1. Open the private key file in a text editor:
   - Windows: `deploy_key` (no extension)
   - Unix: `~/.ssh/deploy_key`

2. Copy the **entire contents** (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

3. Go to GitHub repository settings:
   ```
   Settings → Secrets and variables → Actions
   → New repository secret
   ```

4. Create the secret:
   - **Name**: `DEPLOY_KEY` (EXACT - case sensitive)
   - **Value**: Paste the entire private key contents
   - Click **"Add secret"**

### Step 3: Configure Staging Server

SSH into your staging server and configure the deployment user:

```bash
# 1. Connect to staging server

ssh deploy@staging.example.com

# 2. Create .ssh directory if it doesn't exist

mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 3. Add public key (deploy_key.pub contents) to authorized_keys

echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 4. Verify permissions are correct

ls -la ~/.ssh/
# Output should show: -rw------- for authorized_keys

# 5. Test connection from local machine

# (From your local machine, in the directory with deploy_key):
ssh -i deploy_key deploy@staging.example.com "echo 'SSH connection successful'"

```text
### Step 4: Configure Production Server

Repeat Step 3 for production server:

```bash
# Connect to production server

ssh deploy@prod.example.com

# Follow the same steps as staging

mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Test connection

ssh -i deploy_key deploy@prod.example.com "echo 'Production SSH connection successful'"

```text
### Step 5: Verify SSH Configuration

Test both connections work:

```bash
# Verify staging access

ssh -i deploy_key deploy@staging.example.com "whoami && pwd"
# Expected output: deploy, /home/deploy

# Verify production access

ssh -i deploy_key deploy@prod.example.com "whoami && pwd"
# Expected output: deploy, /home/deploy

# Test Docker access (if applicable)

ssh -i deploy_key deploy@staging.example.com "docker --version"
ssh -i deploy_key deploy@prod.example.com "docker --version"

```text
---

## ⚙️ THIS WEEK - Configure Deployment Hosts (1-2 hours)

### Step 1: Update Workflow Variables

Edit `.github/workflows/ci-cd-pipeline.yml` and update the host variables:

**Find these sections** and update with your actual hosts:

```yaml
# For Staging Deployment (around line 770)

- name: Deploy to staging server

  env:
    DEPLOY_HOST: staging.example.com      # ← UPDATE THIS
    DEPLOY_USER: deploy

# For Production Deployment (around line 854)

- name: Deploy to production

  env:
    DEPLOY_HOST: prod.example.com         # ← UPDATE THIS
    DEPLOY_USER: deploy

```text
**Replace**:
- `staging.example.com` → Your actual staging hostname/IP
- `prod.example.com` → Your actual production hostname/IP
- `deploy` → Your deployment user (if different)

### Step 2: Uncomment Deployment Commands

Find the commented deployment commands and uncomment them:

**For Staging** (around line 791):

```yaml
# Uncomment and configure for your deployment:

# ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'cd /opt/sms && docker-compose pull && docker-compose up -d'

```text
**For Production** (around line 876):

```yaml
# Kubernetes example:

# ssh $DEPLOY_USER@$DEPLOY_HOST 'kubectl set image deployment/sms sms=$IMAGE:$VERSION --record'

```text
Choose the deployment method that matches your infrastructure:

**Option A: Docker Compose**

```bash
ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'cd /opt/sms && docker-compose pull && docker-compose up -d'

```text
**Option B: Kubernetes**

```bash
ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'kubectl set image deployment/sms sms=${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }} --record'

```text
**Option C: Direct Docker**

```bash
ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'docker stop sms || true && docker run -d --name sms -p 8080:8000 ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}:latest'

```text
### Step 3: Prepare Deployment Directories

Ensure deployment directories exist on servers:

```bash
# Connect to staging

ssh deploy@staging.example.com

# Create deployment directory

mkdir -p /opt/sms
cd /opt/sms

# If using Docker Compose, ensure docker-compose.yml exists

# (Copy from your repository or create a production-ready version)

# Set permissions

sudo chown -R deploy:deploy /opt/sms

```text
**Repeat for production server.**

### Step 4: Update Health Check URLs

In the workflow file, find health check sections and update the URLs:

**Staging Health Check** (around line 804):

```yaml
STAGING_URL="https://staging.sms.example.com"  # ← UPDATE

```text
**Production Health Check** (around line 868):

```yaml
PROD_URL="https://sms.example.com"             # ← UPDATE

```text
Make sure these URLs are accessible and `/health` endpoint responds.

### Step 5: Optional - Setup Teams Notifications

If you want Teams notifications (for failures only):

1. **Create Teams Webhook**:
   - Open Microsoft Teams
   - Go to the channel where you want notifications
   - Click **⋮** (More options) → **Connectors**
   - Search **"Incoming Webhook"** → **Configure**
   - Name: `SMS Pipeline`
   - Click **Create**
   - Copy the webhook URL

2. **Add to GitHub Secrets**:
   ```
   Settings → Secrets and variables → Actions
   → New repository secret
   Name: TEAMS_WEBHOOK_URL
   Value: [Paste webhook URL]
   ```

---

## ✅ VALIDATION - Test Complete Setup (30 minutes)

### Test 1: Validate Workflow Syntax

```bash
# Check if workflow is valid YAML

# Run this in your repo directory
python -m pip install yamllint
yamllint .github/workflows/ci-cd-pipeline.yml

# Or use online validator:

# https://www.yamllint.com/

```text
### Test 2: Trigger Test Pipeline

1. Make a small commit to main branch:
   ```bash
   git checkout main
   git commit --allow-empty -m "test: CI/CD setup validation"
   git push origin main
   ```

2. Go to GitHub repository → **Actions** tab

3. Watch the pipeline run and verify:
   - ✅ Smoke tests run successfully
   - ✅ Health checks pass
   - ✅ Slack notification appears in your channel
   - ✅ Deployment step completes (or shows correct error if not configured)

### Test 3: Verify Health Checks

Once deployment completes, manually verify health endpoints:

```bash
# Test staging

curl -i https://staging.sms.example.com/health
# Expected: 200 OK with {"status": "healthy", ...}

# Test production

curl -i https://sms.example.com/health
# Expected: 200 OK with {"status": "healthy", ...}

```text
### Test 4: Check Logs

Review pipeline logs for any issues:

1. Go to GitHub Actions tab
2. Click on latest pipeline run
3. Expand each job to view logs
4. Look for:
   - ❌ `Failed` status
   - ⚠️ `Connection refused` (SSH issues)
   - ⚠️ `Health check failed` (endpoint issues)
   - ✅ `✅ Passed` (success)

---

## 🐛 Troubleshooting

### SSH Connection Issues

**Problem**: `Permission denied (publickey)`

```bash
# Verify key permissions

ls -la ~/.ssh/deploy_key*
# Should show: -rw------- (600) for private key, -rw-r--r-- (644) for public

# Fix permissions

chmod 600 ~/.ssh/deploy_key
chmod 644 ~/.ssh/deploy_key.pub

# Test with verbose output

ssh -vvv -i deploy_key deploy@staging.example.com "echo 'test'"

```text
### Health Check Timeouts

**Problem**: `❌ Staging health check failed after 30 attempts`

```bash
# Check if endpoint is accessible

curl -I https://staging.sms.example.com/health

# Verify SSL certificate (if using HTTPS)

curl -k -I https://staging.sms.example.com/health

# Check if port is open

telnet staging.sms.example.com 443
# Or: nc -zv staging.sms.example.com 443

# Review deployment logs on server

ssh deploy@staging.example.com "docker logs sms | tail -50"

```text
### Slack Notifications Not Appearing

**Problem**: No Slack message after successful pipeline

```bash
# Verify webhook URL is correct (doesn't contain typos)

# Test webhook manually:
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from CI/CD"}' \
  YOUR_WEBHOOK_URL

# Check GitHub secrets are set

# Settings → Secrets → Verify SLACK_WEBHOOK_URL exists

# Check workflow has correct secret name (case-sensitive):

# env:
#   SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

```text
---

## 📋 Complete Setup Checklist

### Slack Integration

- [ ] Slack webhook created
- [ ] Webhook URL copied and verified
- [ ] `SLACK_WEBHOOK_URL` secret added to GitHub
- [ ] Test notification received (on next commit)

### SSH Deployment

- [ ] SSH key pair generated locally
- [ ] Private key added to GitHub secret: `DEPLOY_KEY`
- [ ] Public key deployed to staging server
- [ ] Public key deployed to production server
- [ ] SSH connection tested from local machine
- [ ] Docker access verified on both servers

### Workflow Configuration

- [ ] Staging host URL updated (DEPLOY_HOST)
- [ ] Production host URL updated (DEPLOY_HOST)
- [ ] Health check URLs updated (STAGING_URL, PROD_URL)
- [ ] Deployment commands uncommented
- [ ] Appropriate deployment method selected (Docker Compose/K8s/Direct)

### Testing & Validation

- [ ] Workflow YAML syntax validated
- [ ] Test commit pushed to trigger pipeline
- [ ] Smoke tests executed successfully
- [ ] Health checks passed
- [ ] Slack notification received
- [ ] Deployment completed successfully
- [ ] Health endpoints verified manually (curl)

### Optional - Teams Integration

- [ ] Teams webhook created (optional)
- [ ] `TEAMS_WEBHOOK_URL` secret added (optional)
- [ ] Test failure notification received (optional)

---

## 🎓 Security Best Practices

1. **SSH Key Security**
   - Keep `deploy_key` file secure (don't commit to repo)
   - Use `.gitignore` to prevent accidental commits
   - Rotate keys periodically (every 90 days recommended)
   - Use strong passphrases if possible

2. **Webhook Security**
   - Slack/Teams webhooks are URL-based secrets
   - Don't share webhook URLs in public
   - Don't commit to repositories
   - Store only in GitHub secrets
   - Regenerate if compromised

3. **Deployment User Security**
   - Use dedicated deployment user (not root)
   - Restrict SSH key to specific commands (optional):

     ```
     no-port-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAAC3NzaC...
     ```
   - Monitor deployment logs for unauthorized access
   - Rotate credentials regularly

---

## 📞 Support & Documentation

**If you encounter issues**:

1. Check the troubleshooting section above
2. Review pipeline logs in GitHub Actions
3. Enable SSH verbose logging: `ssh -vvv`
4. Check server deployment logs: `docker logs sms`
5. Verify health endpoints manually: `curl -I https://yourserver.com/health`

**Documentation**:
- [CI/CD Enhancement Guide](CI_CD_ENHANCEMENTS_JAN25.md)
- [CI/CD Pipeline Configuration](.github/workflows/ci-cd-pipeline.yml)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)

---

**Setup Complete When**: All checklist items marked ✅
**Expected Time**: 2-3 hours total
**Support**: Check troubleshooting section or review pipeline logs

