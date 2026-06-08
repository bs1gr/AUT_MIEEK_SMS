# Trivy Security Vulnerability Fix Guide - 2026-06-08

## Overview
Comprehensive guide for identifying and fixing Trivy security vulnerabilities in containerized Student Management System (v1.18.24).

**Note:** To view actual vulnerabilities, visit: https://github.com/bs1gr/AUT_MIEEK_SMS/security/code-scanning

---

## Understanding Trivy

### What is Trivy?
- **Purpose:** Container image and filesystem vulnerability scanner
- **Scope:** Detects vulnerabilities in Docker images, dependencies, and configuration
- **Coverage:** OS packages, application dependencies, misconfigurations
- **Output:** SARIF format integrated into GitHub Security tab

### Trivy Severity Levels
```
CRITICAL  🔴  Needs immediate fixing (exploitable, high impact)
HIGH      🟠  Should fix soon (likely exploitable)
MEDIUM    🟡  Should consider fixing (potentially exploitable)
LOW       🔵  Nice to fix (low impact)
UNKNOWN   ⚪  Severity not determined
```

---

## Common Trivy Issues in Your Project

Based on typical Docker/Python/Node.js projects, here are the most common Trivy findings:

### 1. **Base Image Vulnerabilities** (Most Common)
**Severity:** CRITICAL to MEDIUM
**Root Cause:** Outdated base image in Dockerfile

**Affected Files:**
- `docker/Dockerfile.fullstack`
- `docker/Dockerfile.backend`
- `docker/Dockerfile.frontend`

**Example Issue:**
```dockerfile
# ❌ OLD - Outdated Ubuntu with known CVEs
FROM ubuntu:20.04

# ✅ FIXED - Use latest LTS with security patches
FROM ubuntu:24.04
```

**Python Base Images:**
```dockerfile
# ❌ OLD
FROM python:3.11-slim

# ✅ FIXED - Use latest patch version
FROM python:3.11.8-slim
```

**Node.js Base Images:**
```dockerfile
# ❌ OLD
FROM node:20-alpine

# ✅ FIXED - Use latest LTS
FROM node:22-alpine
```

### 2. **OS Package Vulnerabilities**
**Severity:** HIGH to CRITICAL
**Root Cause:** Outdated system libraries in base image

**Fix Pattern:**
```dockerfile
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      package1 \
      package2 && \
    rm -rf /var/lib/apt/lists/*
```

**Critical Packages to Watch:**
- `openssl` - SSL/TLS vulnerabilities
- `curl` - HTTP client vulnerabilities
- `git` - Version control vulnerabilities
- `libpq` - PostgreSQL client vulnerabilities

### 3. **Python Dependency Vulnerabilities**
**Severity:** MEDIUM to HIGH
**Root Cause:** Outdated Python packages

**Files Affected:**
- `backend/requirements.txt`
- `backend/requirements-dev.txt`

**Common Vulnerable Packages:**
```
# Check your current versions
# pip-audit can identify these automatically

# Example vulnerable patterns:
django < 4.2.8          # ❌ Has CSRF, SQLi vulnerabilities
requests < 2.31.0       # ❌ Has SSL/TLS issues
pillow < 10.0.0         # ❌ Has image processing vulnerabilities
```

**Fix Process:**
```bash
# 1. Run pip-audit to find vulnerable packages
pip-audit --desc

# 2. Update outdated packages
pip install --upgrade package-name

# 3. Regenerate requirements.txt
pip freeze > backend/requirements.txt

# 4. Test application
pytest backend/tests/
```

### 4. **Node.js/npm Dependency Vulnerabilities**
**Severity:** LOW to HIGH
**Root Cause:** Outdated npm packages

**Files Affected:**
- `frontend/package-lock.json`
- `frontend/package.json`

**Fix Process:**
```bash
# 1. Audit dependencies
npm audit

# 2. Fix automatically (if safe)
npm audit fix

# 3. Update individual packages
npm update package-name

# 4. Regenerate lock file
npm ci

# 5. Test frontend
npm run test
```

### 5. **Dockerfile Misconfigurations**
**Severity:** MEDIUM
**Common Issues:**

#### a) Running as root
```dockerfile
# ❌ VULNERABLE
RUN apt-get install app
CMD ["app"]

# ✅ FIXED
RUN useradd -m -u 1000 appuser && \
    apt-get install app && \
    chown -R appuser:appuser /app

USER appuser
CMD ["app"]
```

#### b) Exposed secrets
```dockerfile
# ❌ VULNERABLE
RUN echo "SECRET_KEY=mysecret" > .env

# ✅ FIXED
# Use build args for non-secret values
ARG CONFIG_VERSION=1.0
ENV CONFIG_VERSION=$CONFIG_VERSION
# Secrets injected at runtime via environment
```

#### c) Missing health checks
```dockerfile
# ❌ VULNERABLE
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app"]

# ✅ FIXED
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
CMD ["python", "-m", "uvicorn", "main:app"]
```

### 6. **Image Security Best Practices**
**Severity:** MEDIUM (Process/Policy Issue)

```dockerfile
# ✅ SECURE BASE IMAGE
FROM python:3.11.8-slim-bookworm AS base

# ✅ UPDATE AND CLEAN
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl && \
    rm -rf /var/lib/apt/lists/*

# ✅ CREATE NON-ROOT USER
RUN useradd -m -u 1000 appuser

# ✅ COPY AND BUILD IN SEPARATE STAGE
FROM base AS builder
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ✅ FINAL MINIMAL IMAGE
FROM base
COPY --from=builder /root/.local /home/appuser/.local
COPY app /app
WORKDIR /app
USER appuser

# ✅ HEALTH CHECK
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

---

## Step-by-Step Fix Process

### Phase 1: Assessment (30 minutes)

#### 1.1 View Trivy Findings
```bash
# Check GitHub Security tab
# Navigate to: https://github.com/bs1gr/AUT_MIEEK_SMS/security/code-scanning

# Or run Trivy locally
trivy image ghcr.io/bs1gr/aut_mieek_sms:latest
trivy fs --severity HIGH,CRITICAL .
```

#### 1.2 Categorize Issues
```
Create spreadsheet with columns:
- CVE ID
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Affected Component (OS/Python/Node/Config)
- Remediation Type (update package/upgrade base/config change)
- Effort (1-5 days estimate)
```

### Phase 2: Dependency Updates (1-2 days)

#### 2.1 Update Base Images
```dockerfile
# Check for latest security patch
# Ubuntu: 24.04-20240604 (latest security patch)
# Python: 3.11.8-slim-bookworm
# Node: 22.3.0-alpine

FROM python:3.11.8-slim-bookworm
```

#### 2.2 Update Python Dependencies
```bash
cd backend

# Install latest pip-audit
pip install --upgrade pip-audit

# Identify vulnerable packages
pip-audit --desc > audit-report.txt

# Update all packages to latest compatible versions
pip install --upgrade -r requirements.txt

# Export pinned versions
pip freeze > requirements.txt
```

#### 2.3 Update Node Dependencies
```bash
cd frontend

# Audit dependencies
npm audit

# Fix automatically (review changes before commit)
npm audit fix

# Manually update high-risk packages
npm update lodash express @types/node

# Verify lock file
npm ci
```

### Phase 3: Configuration Hardening (1 day)

#### 3.1 Dockerfile Security Audit
```dockerfile
# Checklist:
✅ Running as non-root user
✅ Using latest base image
✅ Package manager cache cleaned
✅ No hardcoded secrets
✅ Health check configured
✅ Multi-stage build (if applicable)
✅ Minimal image size
✅ Read-only filesystem where possible
```

#### 3.2 Docker Compose Security
```yaml
version: '3.8'
services:
  backend:
    # ✅ Non-root user
    user: "1000:1000"
    # ✅ Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    # ✅ Security options
    security_opt:
      - no-new-privileges:true
    # ✅ Capabilities dropped
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Phase 4: Testing (1 day)

#### 4.1 Local Testing
```bash
# Build images with updated dependencies
docker build -t sms:test docker/Dockerfile.backend

# Run Trivy on local image
trivy image sms:test

# Run security tests
pytest backend/tests/test_control_path_traversal.py -v

# Run application
docker-compose -f docker-compose.test.yml up
```

#### 4.2 CI/CD Verification
```bash
# Push to GitHub
git add Dockerfile requirements.txt package.json
git commit -m "fix: update dependencies to fix Trivy vulnerabilities"
git push

# Monitor GitHub Actions
# Check: code-scanning alerts decrease
```

### Phase 5: Deployment (ongoing)

#### 5.1 Release Notes
```markdown
## Security Updates (v1.18.25)

### Trivy Vulnerability Fixes
- Updated base image from python:3.11-slim to python:3.11.8-slim-bookworm
- Fixed 15 CRITICAL vulnerabilities in OS packages
- Updated Django to 4.2.8+ (CSRF fix)
- Updated requests to 2.31.0+ (SSL/TLS hardening)
- Enabled container security: non-root user, no-new-privileges
- Added health checks to Docker images

### Testing
- All 897 backend tests passing ✅
- All 76 E2E tests passing ✅
- Trivy scan: 0 CRITICAL, 0 HIGH remaining ✅
```

---

## Common Vulnerabilities & Fixes

### CVE Examples

#### CVE-2024-XXXXX: OpenSSL Remote Code Execution
**Severity:** CRITICAL
**Affected:** openssl < 3.2.1
**Fix:**
```dockerfile
FROM python:3.11.8-slim-bookworm
RUN apt-get update && apt-get upgrade -y openssl
```

#### CVE-2024-XXXXX: Django CSRF Token Bypass
**Severity:** HIGH
**Affected:** django < 4.2.8
**Fix:**
```bash
pip install --upgrade 'django>=4.2.8'
```

#### CVE-2024-XXXXX: Node.js Path Traversal
**Severity:** HIGH
**Affected:** express < 4.18.2
**Fix:**
```bash
npm install express@^4.18.2
```

---

## Trivy Configuration Files

### `.trivyignore` (for false positives)
```
# Format: <vulnerability-id> [expiry-date]
# Only use for verified false positives

# Example: Known safe vulnerability in dev-only package
pytest-vulnerability-123 exp:2026-12-31
```

**Rules:**
- Document why each exception exists
- Set expiration dates (max 6 months)
- Review quarterly
- Never ignore CRITICAL vulnerabilities

### `.trivyignore.yaml` (more control)
```yaml
# Skip packages/images
skip_files:
  - /tests/*
  - /build/*
skip_dirs:
  - node_modules
  - __pycache__

# Severity threshold
severity:
  - CRITICAL
  - HIGH
```

---

## GitHub Actions Integration

### Trivy Scanning Workflow
```yaml
name: Trivy Security Scan
on: [push, pull_request]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      
      - name: Run Trivy filesystem scan
        uses: aquasecurity/trivy-action@v0.35.0
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH,MEDIUM'
          
      - name: Upload to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Monitoring & Maintenance

### Weekly Checks
```bash
# Check for new CVEs
trivy image --severity HIGH,CRITICAL ghcr.io/bs1gr/aut_mieek_sms:latest

# Review new alerts on GitHub
# https://github.com/bs1gr/AUT_MIEEK_SMS/security/code-scanning
```

### Monthly Updates
```bash
# Update base images
# Check for new releases: python.org, nodejs.org, ubuntu.com

# Update dependencies
pip list --outdated
npm outdated
```

### Quarterly Review
```bash
# Review .trivyignore exceptions
# Remove expired entries
# Reassess severity classifications

# Run comprehensive scan
trivy image --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL ghcr.io/...
```

---

## Remediation Priority Matrix

| Severity | Time-to-Fix | Type | Action |
|----------|-------------|------|--------|
| 🔴 CRITICAL | < 24 hours | All | STOP: Fix immediately, test, deploy |
| 🟠 HIGH | < 1 week | OS/Crypto | Fix ASAP, include in next release |
| 🟠 HIGH | < 2 weeks | App deps | Fix this sprint, test thoroughly |
| 🟡 MEDIUM | < 2 weeks | Misc | Fix if time allows, plan for next release |
| 🔵 LOW | < 1 month | Warnings | Track, fix in maintenance window |

---

## Useful Commands

```bash
# Run Trivy locally
trivy image ghcr.io/bs1gr/aut_mieek_sms:latest
trivy image --severity HIGH,CRITICAL ghcr.io/bs1gr/aut_mieek_sms:latest
trivy fs --format json . > trivy-report.json
trivy repo https://github.com/bs1gr/AUT_MIEEK_SMS

# Check vulnerabilities in dependencies
pip-audit --desc
npm audit

# Update base images
docker pull python:3.11.8-slim-bookworm
docker pull node:22-alpine
docker pull ubuntu:24.04

# Scan locally built image
docker build -t sms:test .
trivy image sms:test
```

---

## Quick Reference: File Modifications

### 1. Update `docker/Dockerfile.fullstack`
- Change base image to latest LTS
- Add RUN to upgrade OS packages
- Add USER for non-root execution
- Add HEALTHCHECK

### 2. Update `backend/requirements.txt`
- Run pip-audit
- Upgrade all packages
- Test with pytest

### 3. Update `frontend/package.json`
- Run npm audit fix
- Update package-lock.json
- Test with npm test

### 4. Create/Update `.trivyignore`
- Only for verified false positives
- Add expiration dates
- Document reasoning

### 5. Update `docker-compose.yml`
- Add security_opt
- Add resource limits
- Add cap_drop/cap_add

---

## Next Steps

1. **View Trivy Alerts:** https://github.com/bs1gr/AUT_MIEEK_SMS/security/code-scanning
2. **Generate Audit Report:** Run `pip-audit --desc` and `npm audit`
3. **Create Fix Plan:** Document vulnerabilities and effort
4. **Priority CRITICAL:** Fix within 24 hours
5. **Test Thoroughly:** Run full test suite before deployment
6. **Monitor:** Set up weekly/monthly scans

---

## Resources

- **Trivy Documentation:** https://github.com/aquasecurity/trivy
- **Dockerfile Best Practices:** https://docs.docker.com/develop/security-best-practices/
- **pip-audit:** https://github.com/pypa/pip-audit
- **npm audit:** https://docs.npmjs.com/cli/v10/commands/npm-audit
- **CVE Database:** https://www.cvedetails.com/

---

Generated: 2026-06-08
User: faltsasam@gmail.com
Status: Guide Complete - Ready for Implementation
