# CI/CD Standards & Best Practices

**Effective:** 2026-06-07  
**Version:** v1.0  
**Scope:** All GitHub Actions workflows in this repository

---

## Overview

These standards ensure our CI/CD infrastructure remains secure, reliable, and maintainable. They apply to:
- Workflow file modifications
- New workflow creation
- Script additions to workflows
- Dependency updates

---

## Core Principles

### 1. Fail-Fast on Critical Failures

**Rule:** Any failure affecting code quality, security, or deployment must block the pipeline.

**Do:**
```yaml
- name: Run critical security scan
  run: npm audit --audit-level=moderate
  # Fails if vulnerabilities found
```

**Don't:**
```yaml
- name: Run security scan
  run: npm audit --audit-level=moderate || echo "Warning: vulnerabilities found"
  # Silently passes even with vulnerabilities
```

### 2. Explicit Error Handling

**Rule:** All error messages must be actionable and specific.

**Do:**
```bash
if [ ! -f "VERSION" ]; then
  echo "❌ VERSION file not found in repository root"
  echo "Expected: ./VERSION"
  echo "Fix: Create VERSION file with format: v1.x.x"
  exit 1
fi
```

**Don't:**
```bash
if [ ! -f "VERSION" ]; then
  exit 1  # Silent failure
fi
```

### 3. Security by Default

**Rule:** Secrets and credentials must NEVER be hardcoded.

**Do:**
```yaml
- name: Deploy
  run: ./deploy.sh
  env:
    CERT_THUMBPRINT: ${{ secrets.CODESIGN_CERT_THUMBPRINT }}
    API_TOKEN: ${{ secrets.DEPLOYMENT_TOKEN }}
```

**Don't:**
```yaml
- name: Deploy
  run: ./deploy.sh
  env:
    CERT_THUMBPRINT: "2693C1B15C8A8E5E45614308489DC6F4268B075D"  # WRONG!
```

### 4. Minimal Permissions

**Rule:** Jobs should have only the permissions they actually need.

**Do:**
```yaml
permissions:
  contents: read
  security-events: write
```

**Don't:**
```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
  # Only use what you need
```

### 5. Consistent Logging

**Rule:** Use structured output with emojis and status indicators.

**Do:**
```
🔵 Job: Building Docker image
  ✅ Step: Setup buildx
  ✅ Step: Build image
  ✅ Step: Push to registry
  Summary: All steps completed successfully
```

**Don't:**
```
Building...
Done.
```

---

## Workflow Standards

### File Organization

```
.github/
  workflows/
    ci-cd-pipeline.yml          # Main pipeline
    e2e-tests.yml               # Standalone E2E
    deploy.yml                  # Reusable deployment
    security-*.yml              # Security-focused
    maintenance-*.yml           # Operational tasks
  actions/
    normalize-version/          # Custom actions
    check-health/
```

### Naming Conventions

**Workflow names:** Descriptive, action-oriented
```yaml
name: CI/CD Pipeline
name: E2E Tests
name: Deploy to Production
```

**Job names:** Include emoji + brief description
```yaml
jobs:
  lint-backend:
    name: 🔍 Lint Backend Code
  
  test-backend:
    name: 🧪 Backend Tests (Pytest)
  
  security-scan:
    name: 🔒 Security Scanning
```

**Step names:** Clear action description
```yaml
- name: Install dependencies
- name: Run linter
- name: Upload test results
```

### Timeout Standards

**Every job should have a timeout:**

| Job Type | Timeout | Reason |
|----------|---------|--------|
| Linting | 10 min | Should be fast |
| Unit Tests | 30 min | Standard test suite |
| Integration Tests | 45 min | Database setup overhead |
| E2E Tests | 60 min | Browser automation |
| Load Tests | 30 min | Performance testing |
| Build | 20 min | Compilation/bundling |
| Deploy | 30 min | Server deployment |

**Standard:**
```yaml
jobs:
  my-job:
    timeout-minutes: 30
```

### Artifact Retention

**Standards:**

| Artifact Type | Retention | Reasoning |
|---------------|-----------|-----------|
| Test reports | 30 days | Debugging failed tests |
| Build outputs | 7 days | Quick rollback access |
| Security scans | 90 days | Compliance audit trail |
| Coverage reports | 7 days | Trend analysis |
| Logs | 30 days | Troubleshooting |

**Standard:**
```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: coverage/
    retention-days: 30
```

---

## Error Handling Patterns

### Pattern 1: Validation with Clear Error

```yaml
- name: Validate configuration
  run: |
    set -euo pipefail
    
    if [ ! -f ".env.example" ]; then
      echo "❌ Configuration validation failed"
      echo "Missing: .env.example"
      echo "Required for: Example environment variables"
      exit 1
    fi
    
    echo "✅ Configuration validation passed"
```

### Pattern 2: Health Check with Retry

```yaml
- name: Wait for service to be ready
  run: |
    set -euo pipefail
    
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
      ATTEMPT=$((ATTEMPT + 1))
      echo "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
      
      if curl -sf http://localhost:8000/health >/dev/null; then
        echo "✅ Service is ready"
        exit 0
      fi
      
      sleep 2
    done
    
    echo "❌ Service failed to start after $MAX_ATTEMPTS attempts"
    exit 1
```

### Pattern 3: Conditional Steps

```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/main' || contains(github.event.pull_request.labels.*.name, 'deploy-staging')
  run: |
    echo "🚀 Deploying to staging..."
    ./scripts/deploy-staging.sh

- name: Skip deployment (PR)
  if: github.event_name == 'pull_request' && !contains(github.event.pull_request.labels.*.name, 'deploy-staging')
  run: |
    echo "⏭️  Skipping deployment (not requested in PR)"
```

### Pattern 4: Failure Notification

```yaml
- name: Notify on failure
  if: failure()
  run: |
    echo "❌ Pipeline failed at step: ${{ failure() }}"
    echo "Check logs above for details"
    echo "Need help? Post in #devops on Slack"
    exit 1
```

---

## Shell Standards

### Bash Best Practices

```bash
#!/bin/bash
set -euo pipefail  # Always include

# Error handling
trap 'echo "❌ Error on line $LINENO"' ERR

# Clear variable names
CURRENT_VERSION=$(cat VERSION)
BUILD_OUTPUT_DIR="./build"

# Explicit success message
echo "✅ Build completed successfully"
```

### PowerShell Best Practices

```powershell
$ErrorActionPreference = 'Stop'  # Always set

try {
  Write-Host "🔵 Starting deployment..." -ForegroundColor Cyan
  
  # Use Write-Host for output
  Write-Host "  ✅ Step 1 completed" -ForegroundColor Green
  
} catch {
  Write-Host "  ❌ Step failed: $_" -ForegroundColor Red
  exit 1
}
```

---

## Testing Standards

### Test Scope Decision Tree

```
Is this a PR?
├─ Yes: Run unit tests only (fast feedback)
│   └─ PR labeled with "requires:e2e" or "[full-test]" in title?
│       ├─ Yes: Run E2E + load tests
│       └─ No: Unit tests only
└─ No (main branch push):
    └─ Run all tests (unit + E2E + load)
```

### Test Naming

```bash
# ✅ Good test names
test_user_can_login_with_valid_credentials
test_password_reset_email_sent
test_admin_cannot_delete_active_users

# ❌ Bad test names
test_1
test_login
test_user
```

### Flaky Test Handling

**Rule:** Flaky tests must be fixed or marked as flaky, not ignored.

**For known flaky tests:**
```yaml
- name: Run potentially flaky E2E tests
  continue-on-error: true  # Mark as flaky
  run: npm run test:e2e
  
# Then file a GitHub issue to fix the test
```

---

## Security Standards

### Secret Management

**Rules:**
1. Never commit secrets to code
2. Always use GitHub Secrets
3. Document which secrets are needed
4. Rotate secrets quarterly

**Secret checklist:**
- [ ] API tokens
- [ ] Certificates
- [ ] Passwords
- [ ] Private keys
- [ ] Webhooks

### Dependency Updates

**Rule:** Pin all dependencies to specific versions (no wildcards).

**Do:**
```
fastapi==0.136.3
sqlalchemy==2.0.44
```

**Don't:**
```
fastapi>=0.130.0
sqlalchemy~=2.0
```

### Tool Integrity

**Rule:** Download tools from official sources with checksum verification.

```bash
# Download with checksum verification
curl -sSL "https://github.com/tool/releases/download/v1.0/tool.tar.gz" \
  -o tool.tar.gz

curl -sSL "https://github.com/tool/releases/download/v1.0/checksums.txt" \
  -o checksums.txt

# Verify
sha256sum -c checksums.txt

# Extract
tar -xzf tool.tar.gz
```

---

## Documentation Standards

### Every workflow should document:

1. **Purpose** - What does this workflow do?
2. **Triggers** - When does it run?
3. **Requirements** - What secrets/permissions are needed?
4. **Duration** - How long does it take?
5. **Outputs** - What does it produce?

**Example:**
```yaml
name: E2E Tests
on: [push, pull_request]
# Purpose: Run end-to-end tests with Playwright
# Triggers: All pushes to main, all PRs
# Duration: ~20 minutes
# Requirements: None (uses built-in Chrome)
# Outputs: Test results, screenshots of failures
```

---

## Code Review Checklist

When reviewing workflow PRs, check:

- [ ] All secrets use `${{ secrets.NAME }}`
- [ ] Jobs have explicit `permissions:`
- [ ] Timeouts are set
- [ ] Error messages are clear and actionable
- [ ] Logs use consistent emoji/status format
- [ ] No hardcoded credentials
- [ ] Dependencies are pinned to exact versions
- [ ] Comments explain non-obvious logic
- [ ] Shell scripts use `set -euo pipefail`
- [ ] PowerShell scripts set `$ErrorActionPreference`

---

## Common Mistakes

### ❌ Mistake #1: Silent Failures
```yaml
# Wrong
- name: Run security scan
  run: npm audit || echo "Audit failed"  # Silent pass
```
```yaml
# Right
- name: Run security scan
  run: npm audit  # Fails loudly if issues found
```

### ❌ Mistake #2: Hardcoded Secrets
```yaml
# Wrong
run: echo "$PASSWORD" | ./deploy.sh  # Exposed!
```
```yaml
# Right
run: ./deploy.sh
env:
  PASSWORD: ${{ secrets.DEPLOY_PASSWORD }}
```

### ❌ Mistake #3: No Timeout
```yaml
# Wrong
jobs:
  my-job:
    runs-on: ubuntu-latest
    # Can hang forever
```
```yaml
# Right
jobs:
  my-job:
    timeout-minutes: 30
    runs-on: ubuntu-latest
```

### ❌ Mistake #4: Unclear Error Messages
```yaml
# Wrong
if [ $? -ne 0 ]; then
  exit 1  # Why did it fail?
fi
```
```yaml
# Right
if [ ! -f "config.json" ]; then
  echo "❌ Missing config.json"
  echo "Create one from config.json.example"
  exit 1
fi
```

---

## When to Update This Document

Update CI-CD-STANDARDS.md when:
- [ ] Workflow conventions change
- [ ] New tools are adopted
- [ ] Security practices evolve
- [ ] Team feedback suggests improvements

---

## Questions?

- **General questions:** #devops on Slack
- **Standards clarification:** GitHub issue with [standards] tag
- **New workflow needed:** Ask in #engineering

---

**Last Updated:** 2026-06-07  
**Next Review:** 2026-09-07 (quarterly)
