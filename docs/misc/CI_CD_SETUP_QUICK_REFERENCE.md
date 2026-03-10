# CI/CD Setup - Quick Reference Card

## ⏱️ Timeline Overview

```text
THIS HOUR (15 min)          THIS WEEK (1-2 hours)       ONGOING
├─ Slack Setup              ├─ SSH Configuration        ├─ Monitor Runs
│  ├─ Create Webhook        │  ├─ Generate Keys         ├─ Review Logs
│  └─ Add Secret            │  ├─ Deploy Keys           └─ Troubleshoot
│                           │  └─ Test SSH
└─ Team Notifications       │
   (Optional)               └─ Deployment Config
                               ├─ Update Hosts
                               ├─ Uncomment Commands
                               └─ Test Deployment

```text
---

## 🚀 THIS HOUR - Slack Setup (15 minutes)

### 1️⃣ Create Slack Webhook

```text
Slack → Workspace Settings → Manage Apps → Incoming Webhooks
→ Create New → Select Channel → Copy URL

```text
### 2️⃣ Add to GitHub Secrets

```text
GitHub → Settings → Secrets → New Repository Secret
Name: SLACK_WEBHOOK_URL
Value: [PASTE WEBHOOK URL]

```text
### 3️⃣ Optional - Teams Setup

```text
Microsoft Teams → Channel → Settings → Connectors
→ Incoming Webhook → Create → Copy URL
→ GitHub → Settings → Secrets → New Secret
Name: TEAMS_WEBHOOK_URL
Value: [PASTE WEBHOOK URL]

```text
---

## 🔑 TODAY - SSH Setup (45 minutes)

### 1️⃣ Generate SSH Key

```powershell
# Generate key pair

ssh-keygen -t ed25519 -f deploy_key -N ""

# Or use helper script

.\CI_CD_SETUP_HELPER.ps1 -Action generate_ssh

```text
### 2️⃣ Add Private Key to GitHub

```text
GitHub → Settings → Secrets → New Repository Secret
Name: DEPLOY_KEY
Value: [PASTE ENTIRE CONTENTS OF deploy_key FILE]

```text
### 3️⃣ Deploy Public Key to Servers

```bash
# Staging

ssh deploy@staging.example.com
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "[PUBLIC_KEY_CONTENT]" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Production (repeat same steps)

ssh deploy@prod.example.com
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "[PUBLIC_KEY_CONTENT]" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

```text
### 4️⃣ Test Connections

```bash
# Test both servers

ssh -i deploy_key deploy@staging.example.com "echo OK"
ssh -i deploy_key deploy@prod.example.com "echo OK"

# Or use helper

.\CI_CD_SETUP_HELPER.ps1 -Action test_connections `
  -StagingHost staging.example.com `
  -ProductionHost prod.example.com

```text
---

## ⚙️ THIS WEEK - Deployment Config (1-2 hours)

### 1️⃣ Update Workflow Hosts

Edit `.github/workflows/ci-cd-pipeline.yml`:

**Find → Replace**:

```text
staging.example.com      → YOUR_STAGING_HOST
prod.example.com         → YOUR_PRODUCTION_HOST
deploy                   → YOUR_DEPLOY_USER (usually 'deploy')

```text
### 2️⃣ Update Health Check URLs

**Find → Replace**:

```text
https://staging.sms.example.com  → YOUR_STAGING_URL
https://sms.example.com          → YOUR_PROD_URL

```text
### 3️⃣ Uncomment Deployment Commands

Choose your deployment method and uncomment:

**Docker Compose**:

```yaml
ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'cd /opt/sms && docker-compose pull && docker-compose up -d'

```text
**Kubernetes**:

```yaml
ssh -i ${{ secrets.DEPLOY_KEY }} $DEPLOY_USER@$DEPLOY_HOST 'kubectl set image deployment/sms sms=${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }} --record'

```text
### 4️⃣ Prepare Deployment Directory

```bash
# On each server

mkdir -p /opt/sms
sudo chown -R deploy:deploy /opt/sms

# If using Docker Compose, copy compose file

scp -i deploy_key docker-compose.yml deploy@staging.example.com:/opt/sms/
scp -i deploy_key docker-compose.yml deploy@prod.example.com:/opt/sms/

```text
---

## ✅ VALIDATION - Test Everything

### Test 1: Commit & Trigger Pipeline

```bash
git commit --allow-empty -m "test: CI/CD setup validation"
git push origin main
# Watch: GitHub → Actions → Latest Run

```text
### Test 2: Verify Each Step

```text
✓ Smoke tests pass
✓ Health checks pass
✓ Slack notification received
✓ Deployment completes

```text
### Test 3: Manual Health Checks

```bash
curl -I https://staging.example.com/health
curl -I https://prod.example.com/health
# Expected: 200 OK + {"status": "healthy"}

```text
### Test 4: Helper Script Verification

```powershell
.\CI_CD_SETUP_HELPER.ps1 -Action verify_setup
.\CI_CD_SETUP_HELPER.ps1 -Action validate_workflow

```text
---

## 🛠️ Helper Script Commands

```powershell
# Generate SSH key

.\CI_CD_SETUP_HELPER.ps1 -Action generate_ssh

# Verify setup completeness

.\CI_CD_SETUP_HELPER.ps1 -Action verify_setup

# Test SSH connections

.\CI_CD_SETUP_HELPER.ps1 -Action test_connections `
  -StagingHost staging.example.com `
  -ProductionHost prod.example.com `
  -DeployUser deploy `
  -KeyPath ./deploy_key

# Validate workflow YAML

.\CI_CD_SETUP_HELPER.ps1 -Action validate_workflow

```text
---

## 📋 Setup Checklist

### Slack

- [ ] Webhook created
- [ ] URL copied
- [ ] Secret added to GitHub
- [ ] Notification received on first commit

### SSH

- [ ] Key pair generated
- [ ] Private key added to GitHub secret
- [ ] Public key deployed to staging
- [ ] Public key deployed to production
- [ ] SSH connections tested
- [ ] Docker access verified

### Workflow

- [ ] Host variables updated
- [ ] Health check URLs updated
- [ ] Deployment commands uncommented
- [ ] Deployment method selected

### Testing

- [ ] Pipeline run triggered
- [ ] All jobs completed
- [ ] Health checks passed
- [ ] Notifications received

### Status

- [ ] Setup complete and verified
- [ ] Historically documented as production-capable

---

## ⚡ Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH permission denied | Check key permissions: `ls -la ~/.ssh/deploy_key*` |
| Health check timeout | Verify endpoint accessible: `curl https://host/health` |
| No Slack message | Check webhook URL in secrets (Settings → Secrets) |
| Deployment fails | Review SSH logs: `ssh -vvv -i key deploy@host` |
| Workflow validation error | Check YAML syntax: `yamllint .github/workflows/ci-cd-pipeline.yml` |

---

## 📚 Documentation

- **Complete Guide**: `CI_CD_SETUP_COMPLETE_GUIDE.md`
- **Implementation Details**: `docs/CI_CD_ENHANCEMENTS_JAN25.md`
- **Workflow Reference**: `.github/workflows/ci-cd-pipeline.yml`
- **Troubleshooting**: `docs/deployment/TROUBLESHOOTING.md`

---

**Status**: Setup ready to begin | **Version**: 1.17.4 | **Date**: January 25, 2026
