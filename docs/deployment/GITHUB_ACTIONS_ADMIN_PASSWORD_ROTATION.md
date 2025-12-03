# GitHub Actions Admin Password Rotation Guide

This guide demonstrates how to automate admin credential rotation for the Student Management System using GitHub Actions and the `DEFAULT_ADMIN_AUTO_RESET` feature.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Security Best Practices](#security-best-practices)
- [Quick Start](#quick-start)
- [Complete Workflow Examples](#complete-workflow-examples)
- [Integration with Secret Managers](#integration-with-secret-managers)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Overview

The `DEFAULT_ADMIN_AUTO_RESET` feature enables safe, automated rotation of the default administrator password. When enabled, the application will:

1. Compare the configured `DEFAULT_ADMIN_PASSWORD` with the stored database hash at startup
2. If they differ, update the password in the database
3. Revoke all existing refresh tokens for the admin user
4. Log the password rotation event

This feature is **intentionally disabled by default** to prevent unexpected changes in production environments.

### Use Cases

- **Scheduled Password Rotation**: Comply with security policies requiring periodic credential updates
- **Incident Response**: Quickly rotate credentials across multiple deployments after a security event
- **Secret Manager Integration**: Synchronize credentials with external secret management systems
- **CI/CD Deployments**: Automatically provision fresh credentials for ephemeral test environments

## Prerequisites

### Environment Configuration

Your application must be configured with these environment variables:

```bash
# Enable authentication
AUTH_ENABLED=True

# Default admin account configuration
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_FULL_NAME=System Administrator

# Current admin password (will be rotated)
DEFAULT_ADMIN_PASSWORD=your-current-password

# Enable automatic password rotation (CRITICAL)
DEFAULT_ADMIN_AUTO_RESET=True
```

### GitHub Secrets Setup

Store sensitive credentials as GitHub repository secrets:

1. Navigate to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

   | Secret Name | Description | Example Value |
   |-------------|-------------|---------------|
   | `ADMIN_EMAIL` | Administrator email address | `admin@example.com` |
   | `ADMIN_PASSWORD` | Current admin password | `CurrentSecurePass123!` |
   | `NEW_ADMIN_PASSWORD` | New password to rotate to | `NewSecurePass456!` |
   | `SECRET_KEY` | Application secret key | `<64-character random string>` |
   | `DEPLOYMENT_HOST` | Production server hostname/IP | `prod.example.com` |
   | `DEPLOYMENT_USER` | SSH user for deployments | `deploy` |
   | `SSH_PRIVATE_KEY` | SSH key for server access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## Security Best Practices

### Password Requirements

Follow these guidelines when generating new passwords:

```bash
# Generate a strong password using Python
python -c "import secrets, string; chars = string.ascii_letters + string.digits + string.punctuation; print(''.join(secrets.choice(chars) for _ in range(32)))"

# Or using PowerShell
-join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or using OpenSSL
openssl rand -base64 32
```

**Requirements:**
- Minimum length: 12 characters (recommend 24+)
- Include uppercase, lowercase, digits, and special characters
- Avoid dictionary words or predictable patterns
- Never commit passwords to source control

### Secret Management

**DO:**
- ✅ Store passwords in GitHub Secrets or a secret manager
- ✅ Use environment-specific secrets (dev/staging/prod)
- ✅ Enable audit logging for secret access
- ✅ Rotate secrets regularly (e.g., every 90 days)
- ✅ Use separate admin accounts for different environments

**DON'T:**
- ❌ Hardcode passwords in workflow files
- ❌ Echo passwords in workflow logs
- ❌ Commit `.env` files with real credentials
- ❌ Share admin credentials across environments
- ❌ Use weak or predictable passwords

### Token Revocation

When `DEFAULT_ADMIN_AUTO_RESET=True` and a password rotation occurs:

- **All existing refresh tokens** for the admin user are revoked
- Active sessions will require re-authentication after token expiry
- Users will receive "Invalid or expired token" errors
- New logins will receive fresh tokens with the new password

**Important:** This is a security feature to prevent session hijacking after credential rotation.

## Quick Start

### Basic Password Rotation Workflow

Create `.github/workflows/rotate-admin-password.yml`:

```yaml
name: Rotate Admin Password

on:
  workflow_dispatch:  # Manual trigger
    inputs:
      reason:
        description: 'Reason for rotation'
        required: true
        default: 'Scheduled rotation'

jobs:
  rotate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Update environment configuration
        run: |
          # Create updated .env file with new password
          cat > backend/.env <<EOF
          AUTH_ENABLED=True
          DEFAULT_ADMIN_EMAIL=${{ secrets.ADMIN_EMAIL }}
          DEFAULT_ADMIN_PASSWORD=${{ secrets.NEW_ADMIN_PASSWORD }}
          DEFAULT_ADMIN_FULL_NAME=System Administrator
          DEFAULT_ADMIN_AUTO_RESET=True
          SECRET_KEY=${{ secrets.SECRET_KEY }}
          EOF

      - name: Deploy to production
        uses: appleboy/ssh-action@$11.9.7
        with:
          host: ${{ secrets.DEPLOYMENT_HOST }}
          username: ${{ secrets.DEPLOYMENT_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/student-management-system
            # Pull latest changes
            git pull origin main

            # Update environment file
            cat > backend/.env <<EOF
            AUTH_ENABLED=True
            DEFAULT_ADMIN_EMAIL=${{ secrets.ADMIN_EMAIL }}
            DEFAULT_ADMIN_PASSWORD=${{ secrets.NEW_ADMIN_PASSWORD }}
            DEFAULT_ADMIN_FULL_NAME=System Administrator
            DEFAULT_ADMIN_AUTO_RESET=True
            SECRET_KEY=${{ secrets.SECRET_KEY }}
            EOF

            # Restart application (Docker mode)
            ./DOCKER.ps1 -Stop
            ./DOCKER.ps1 -Start

      - name: Verify rotation
        run: |
          echo "✅ Password rotation completed"
          echo "📋 Reason: ${{ github.event.inputs.reason }}"
          echo "⏰ Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
          echo "👤 Triggered by: ${{ github.actor }}"
```

### Usage

1. Go to **Actions** tab in your repository
2. Select **Rotate Admin Password** workflow
3. Click **Run workflow**
4. Enter rotation reason (e.g., "Quarterly security rotation")
5. Click **Run workflow** to start

## Complete Workflow Examples

### Scheduled Monthly Rotation

Automatically rotate credentials on the first day of each month:

```yaml
name: Monthly Admin Password Rotation

on:
  schedule:
    # Run at 2 AM UTC on the 1st of every month
    - cron: '0 2 1 * *'
  workflow_dispatch:

jobs:
  rotate:
    runs-on: ubuntu-latest

    steps:
      - name: Generate new password
        id: gen_password
        run: |
          # Generate a cryptographically secure password
          NEW_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + string.punctuation; print(''.join(secrets.choice(chars) for _ in range(32)))")
          echo "::add-mask::$NEW_PASS"
          echo "new_password=$NEW_PASS" >> $GITHUB_OUTPUT

      - name: Update production environment
        uses: appleboy/ssh-action@$11.9.7
        with:
          host: ${{ secrets.DEPLOYMENT_HOST }}
          username: ${{ secrets.DEPLOYMENT_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/student-management-system

            # Backup current .env
            cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)

            # Update .env with new password
            sed -i "s/^DEFAULT_ADMIN_PASSWORD=.*/DEFAULT_ADMIN_PASSWORD=${{ steps.gen_password.outputs.new_password }}/" backend/.env

            # Ensure auto-reset is enabled
            if ! grep -q "^DEFAULT_ADMIN_AUTO_RESET=" backend/.env; then
              echo "DEFAULT_ADMIN_AUTO_RESET=True" >> backend/.env
            else
              sed -i "s/^DEFAULT_ADMIN_AUTO_RESET=.*/DEFAULT_ADMIN_AUTO_RESET=True/" backend/.env
            fi

            # Restart application
            pwsh -NoProfile -File DOCKER.ps1 -Stop
            pwsh -NoProfile -File DOCKER.ps1 -Start

      - name: Update GitHub secret
        uses: gliech/create-github-secret-action@v1
        with:
          name: ADMIN_PASSWORD
          value: ${{ steps.gen_password.outputs.new_password }}
          pa_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}

      - name: Send notification
        uses: slackapi/slack-github-action@$11.9.7
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🔐 Admin password rotated successfully",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Admin Password Rotation Completed*\n\n• Environment: Production\n• Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")\n• Workflow: Monthly Scheduled Rotation"
                  }
                }
              ]
            }
```

### Multi-Environment Rotation

Rotate passwords across development, staging, and production:

```yaml
name: Multi-Environment Password Rotation

on:
  workflow_dispatch:
    inputs:
      environments:
        description: 'Environments to rotate (comma-separated)'
        required: true
        default: 'dev,staging,prod'

jobs:
  rotate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ fromJson(format('["{0}"]', github.event.inputs.environments)) }}

    environment: ${{ matrix.environment }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate environment-specific password
        id: gen_pass
        run: |
          NEW_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
          echo "::add-mask::$NEW_PASS"
          echo "password=$NEW_PASS" >> $GITHUB_OUTPUT

      - name: Deploy to ${{ matrix.environment }}
        uses: appleboy/ssh-action@$11.9.7
        with:
          host: ${{ secrets[format('{0}_HOST', matrix.environment)] }}
          username: ${{ secrets[format('{0}_USER', matrix.environment)] }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/sms-${{ matrix.environment }}

            # Update .env
            cat > backend/.env <<EOF
            AUTH_ENABLED=True
            DEFAULT_ADMIN_EMAIL=${{ secrets[format('{0}_ADMIN_EMAIL', matrix.environment)] }}
            DEFAULT_ADMIN_PASSWORD=${{ steps.gen_pass.outputs.password }}
            DEFAULT_ADMIN_FULL_NAME=System Administrator
            DEFAULT_ADMIN_AUTO_RESET=True
            SECRET_KEY=${{ secrets[format('{0}_SECRET_KEY', matrix.environment)] }}
            DATABASE_URL=${{ secrets[format('{0}_DATABASE_URL', matrix.environment)] }}
            EOF

            # Restart
            pwsh -NoProfile -File DOCKER.ps1 -Stop
            pwsh -NoProfile -File DOCKER.ps1 -Start

      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://${{ matrix.environment }}.example.com/health || exit 1
```

## Integration with Secret Managers

### AWS Secrets Manager

```yaml
name: Rotate Admin Password (AWS Secrets Manager)

on:
  workflow_dispatch:

jobs:
  rotate:
    runs-on: ubuntu-latest

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Generate and store new password
        id: rotate
        run: |
          # Generate new password
          NEW_PASS=$(python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(32)))")

          # Update AWS Secrets Manager
          aws secretsmanager put-secret-value \
            --secret-id sms/admin/password \
            --secret-string "$NEW_PASS"

          echo "::add-mask::$NEW_PASS"
          echo "password=$NEW_PASS" >> $GITHUB_OUTPUT

      - name: Deploy updated configuration
        uses: appleboy/ssh-action@$11.9.7
        with:
          host: ${{ secrets.DEPLOYMENT_HOST }}
          username: ${{ secrets.DEPLOYMENT_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/student-management-system

            # Fetch password from AWS Secrets Manager
            export NEW_PASSWORD=$(aws secretsmanager get-secret-value --secret-id sms/admin/password --query SecretString --output text)

            # Update .env
            sed -i "s/^DEFAULT_ADMIN_PASSWORD=.*/DEFAULT_ADMIN_PASSWORD=$NEW_PASSWORD/" backend/.env
            sed -i "s/^DEFAULT_ADMIN_AUTO_RESET=.*/DEFAULT_ADMIN_AUTO_RESET=True/" backend/.env

            # Restart
            pwsh -NoProfile -File DOCKER.ps1 -Stop
            pwsh -NoProfile -File DOCKER.ps1 -Start
```

### HashiCorp Vault

```yaml
name: Rotate Admin Password (Vault)

on:
  workflow_dispatch:

jobs:
  rotate:
    runs-on: ubuntu-latest

    steps:
      - name: Import Secrets from Vault
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.example.com
          token: ${{ secrets.VAULT_TOKEN }}
          secrets: |
            secret/data/sms/admin email | ADMIN_EMAIL ;
            secret/data/sms/admin current_password | CURRENT_PASSWORD

      - name: Generate new password
        id: gen
        run: |
          NEW_PASS=$(openssl rand -base64 32)
          echo "::add-mask::$NEW_PASS"
          echo "password=$NEW_PASS" >> $GITHUB_OUTPUT

      - name: Update Vault secret
        run: |
          vault kv put secret/sms/admin \
            email="${{ env.ADMIN_EMAIL }}" \
            current_password="${{ steps.gen.outputs.password }}" \
            previous_password="${{ env.CURRENT_PASSWORD }}" \
            rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        env:
          VAULT_ADDR: https://vault.example.com
          VAULT_TOKEN: ${{ secrets.VAULT_TOKEN }}

      - name: Deploy to production
        uses: appleboy/ssh-action@$11.9.7
        with:
          host: ${{ secrets.DEPLOYMENT_HOST }}
          username: ${{ secrets.DEPLOYMENT_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Application reads directly from Vault
            pwsh -NoProfile -File DOCKER.ps1 -Stop
            pwsh -NoProfile -File DOCKER.ps1 -Start
```

## Troubleshooting

### Password Not Updating

**Symptom:** Application starts but password remains unchanged

**Causes:**
1. `DEFAULT_ADMIN_AUTO_RESET` not set to `True`
2. Password hash comparison fails silently
3. Environment file not reloaded

**Solution:**
```bash
# Verify environment configuration
grep "DEFAULT_ADMIN_AUTO_RESET" backend/.env
# Should output: DEFAULT_ADMIN_AUTO_RESET=True

# Check application logs
docker logs sms-app | grep -i "bootstrap"
# Look for: "Bootstrap: updated default admin user ... (password)"

# Force restart to reload environment
./DOCKER.ps1 -Stop
./DOCKER.ps1 -Start
```

### Refresh Tokens Not Revoked

**Symptom:** Old sessions still work after password rotation

**Causes:**
1. Token revocation failed silently
2. Database transaction rollback
3. `RefreshToken` model not available

**Solution:**
```bash
# Manually revoke all refresh tokens for admin
docker exec sms-app python3 -c "
from backend.db import SessionLocal
from backend.models import RefreshToken, User

session = SessionLocal()
try:
    admin = session.query(User).filter(User.email == 'admin@example.com').first()
    if admin:
        session.query(RefreshToken).filter(RefreshToken.user_id == admin.id).update({'revoked': True})
        session.commit()
        print(f'Revoked all tokens for {admin.email}')
finally:
    session.close()
"
```

### Deployment Fails

**Symptom:** GitHub Actions workflow fails during deployment

**Common Errors:**

**SSH Connection Failed:**
```yaml
# Solution: Verify SSH key and host
- name: Test SSH connection
  run: |
    ssh -i <(echo "${{ secrets.SSH_PRIVATE_KEY }}") \
        -o StrictHostKeyChecking=no \
        ${{ secrets.DEPLOYMENT_USER }}@${{ secrets.DEPLOYMENT_HOST }} \
        "echo 'SSH connection successful'"
```

**Permission Denied:**
```bash
# Solution: Ensure deployment user has correct permissions
sudo chown -R deploy:deploy /opt/student-management-system
sudo chmod -R 755 /opt/student-management-system
```

**Application Won't Start:**
```bash
# Check Docker logs
docker logs sms-app --tail 100

# Verify .env file syntax
cat backend/.env | grep -v '^#' | grep -v '^$'

# Test configuration
docker exec sms-app python3 -c "from backend.config import settings; print(settings.DEFAULT_ADMIN_AUTO_RESET)"
```

### Audit Logging

Monitor password rotation events in application logs:

```bash
# View rotation events
docker logs sms-app 2>&1 | grep -i "bootstrap.*password"

# Expected output:
# Bootstrap: updated default admin user admin@example.com (password)
# Bootstrap: created default admin user admin@example.com
```

## FAQ

### Q: How often should I rotate the admin password?

**A:** Follow your organization's security policy. Common intervals:
- **High Security:** Every 30-60 days
- **Medium Security:** Every 90 days
- **Low Security:** Every 180 days
- **Ad-hoc:** After suspected compromise or staff changes

### Q: Can I rotate passwords for multiple admin accounts?

**A:** The `DEFAULT_ADMIN_AUTO_RESET` feature only affects the configured `DEFAULT_ADMIN_EMAIL` account. For multiple admins:
1. Create separate workflow runs for each account
2. Use database scripts to update additional accounts
3. Consider using a user management API endpoint

### Q: What happens to active user sessions during rotation?

**A:**
- **Access tokens** remain valid until expiry (typically 15-60 minutes)
- **Refresh tokens** are immediately revoked
- Users must re-authenticate when their access token expires
- No active sessions are forcibly terminated

### Q: Is there a rollback mechanism?

**A:** Yes, several options:

**Option 1: Restore from backup**
```bash
# The workflow example backs up .env before changes
cp backend/.env.backup.20251123_020000 backend/.env
./DOCKER.ps1 -Stop
./DOCKER.ps1 -Start
```

**Option 2: Set previous password**
```bash
# Update .env with previous password
DEFAULT_ADMIN_PASSWORD=<previous-password>
DEFAULT_ADMIN_AUTO_RESET=True

# Restart to apply
./DOCKER.ps1 -Stop
./DOCKER.ps1 -Start
```

**Option 3: Manual database update**
```bash
# Use admin reset script
python3 scripts/reset_admin_password.py \
  --email admin@example.com \
  --password "<previous-password>"
```

### Q: Can I disable auto-reset after rotation?

**A:** Yes, set `DEFAULT_ADMIN_AUTO_RESET=False` after the rotation completes. However, leaving it enabled is recommended for:
- Consistent rotation behavior
- Emergency credential updates
- CI/CD pipeline integration

### Q: How do I verify the rotation succeeded?

**A:**
```bash
# Test login with new credentials
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "<new-password>"
  }'

# Expected: 200 OK with access token
# Failed: 401 Unauthorized
```

### Q: Can I use this feature without GitHub Actions?

**A:** Absolutely! `DEFAULT_ADMIN_AUTO_RESET` works with:
- Manual `.env` file updates
- AWS Systems Manager Parameter Store
- Azure Key Vault
- Kubernetes Secrets
- Ansible playbooks
- Terraform configurations
- Any configuration management tool

Simply set the environment variable and restart the application.

## Additional Resources

- [Backend Admin Bootstrap Source Code](../../backend/admin_bootstrap.py)
- [Environment Variables Reference](../../backend/ENV_VARS.md)
- [Authentication Documentation](../development/AUTHENTICATION.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [Docker Deployment Script](../../DOCKER.ps1)

## Support

For issues or questions:
1. Check application logs: `docker logs sms-app`
2. Review this guide's troubleshooting section
3. Open a GitHub issue with:
   - Workflow YAML configuration
   - Relevant log excerpts (redact secrets!)
   - Environment details (OS, Docker version)

---

**Last Updated:** 2025-11-23
**Version:** 1.8.8

