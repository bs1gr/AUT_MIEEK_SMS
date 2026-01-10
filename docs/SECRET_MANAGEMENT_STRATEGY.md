# Secret Management Strategy - Student Management System

**Document Version**: 1.0
**Last Updated**: January 10, 2026
**Status**: Comprehensive Review Complete

---

## Executive Summary

The SMS project uses a **multi-layered secret management strategy** with responsibility distributed across:

1. **Repository Owner** - GitHub secrets and production credentials
2. **Developers** - Local .env files and secure development environment
3. **CI/CD Pipeline** - Automated secret scanning and validation
4. **Application** - Runtime validation and enforcement

---

## Current Secret Management Setup

### A. GitHub Secrets (Repository Level)

**Location**: Settings → Secrets and variables → Actions

**Current Secrets** (4 configured):

| Secret | Purpose | Owner | Updated | Status |
|--------|---------|-------|---------|--------|
| `CI_MONITOR_TOKEN` | CI monitoring access | DevOps/Repository Owner | ~2 months ago | ✅ Active |
| `DOCKERHUB_TOKEN` | Docker Hub push access | DevOps/Repository Owner | ~2 months ago | ✅ Active |
| `DOCKERHUB_USERNAME` | Docker Hub credentials | DevOps/Repository Owner | ~2 months ago | ✅ Active |
| `VASILEIOSSAMARAS` | GitHub user reference (unclear purpose) | Repository Owner | ~2 months ago | ⚠️ Review needed |

**Missing Secrets** (Required for current work):

| Secret | Purpose | Priority |
|--------|---------|----------|
| `CODECOV_TOKEN` | Code coverage uploads (PR #132 fix) | 🔴 CRITICAL - Next |
| `ADMIN_GH_PAT` | GitHub API admin operations (optional) | 🟡 MEDIUM |

### B. Environment Files (Local Development)

**Files Structure**:

```
.env.example                    (Tracked - template only)
.env.production.example         (Tracked - template only)
.env                           (⚠️ Gitignored - DO NOT COMMIT)
backend/.env                   (⚠️ Gitignored - DO NOT COMMIT)
frontend/.env                  (⚠️ Gitignored - DO NOT COMMIT)
docker/.env                    (⚠️ Gitignored - DO NOT COMMIT)
.env.qnap.example             (Tracked - QNAP-specific template)
.env.production.SECURE        (⚠️ Gitignored - Production secrets only)
```

**Git Protection** (`.gitignore` enforcement):

```gitignore
# Environment files (use .env.example as template)
.env
backend/.env
frontend/.env
docker/.env
*.env
!*.env.example
.env.production.SECURE  # Production secrets file (DO NOT COMMIT)
```

### C. Secrets in Code (Scanning)

**Scanning Tools**:

1. **Gitleaks** - Pre-commit hook and CI job
   - Config: `.gitleaks.toml`
   - Prevents hardcoded secrets before commit
   - CI job: "Secret Scanning (Gitleaks)" in ci-cd-pipeline.yml

2. **Detect-Secrets** - Baseline configuration
   - Config: `.secrets.baseline`
   - Maintains allowlist of expected patterns
   - Filters common false positives

3. **Pre-commit Hooks**
   - `detect-secrets (prevent committing secrets)` - Blocks secret commits

---

## Critical Security Settings

### 1. SECRET_KEY Management

**What It Does**:
- Cryptographically signs JWT authentication tokens
- Weak key = attackers can forge tokens and impersonate any user

**Current Implementation**:

```yaml
Template (.env.example):
  SECRET_KEY=your-secret-key-change-this-in-production-use-long-random-string-at-least-32-chars

Production (.env.production.example):
  SECRET_KEY=REPLACE_WITH_RANDOM_64_CHAR_SECRET
  SECRET_KEY_STRICT_ENFORCEMENT=1
```

**Enforcement Layers**:

1. **Docker Validation** (DOCKER.ps1)
   - Checks SECRET_KEY meets minimum requirements (32+ chars)
   - Rejects if matches insecure patterns ("change", "example", "placeholder")
   - Fails startup if key is weak

2. **Backend Validation** (backend/config.py)
   - Runtime validation when AUTH_ENABLED=True
   - Rejects weak/default keys
   - Logs security warnings

3. **Generation Helper**:
   ```bash
   # Secure 64-character key (recommended)
   python -c "import secrets; print(secrets.token_urlsafe(64))"

   # Minimum 43-character key
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### 2. Admin Credentials

**Default Credentials** (Documented in code):

```
Email: admin@example.com
Password: YourSecurePassword123!
```

**⚠️ CRITICAL**: These are publicly documented and MUST be changed.

**Setup Methods**:

1. **Pre-Deployment** (Recommended):
   ```env
   DEFAULT_ADMIN_EMAIL=your.email@company.com
   DEFAULT_ADMIN_PASSWORD=<secure-generated-password>
   DEFAULT_ADMIN_FORCE_RESET=1
   ```

2. **Post-Deployment**: Via Control Panel → Maintenance
3. **Scripts**: Dedicated credential management scripts available

### 3. Database Credentials

**Production** (PostgreSQL):

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=student_management
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
DATABASE_URL=postgresql+psycopg://sms_user:PASSWORD@host:5432/db
```

**Development** (SQLite - no password):

```env
DATABASE_URL=sqlite:///./data/student_management.db
```

---

## Responsibility Matrix

### Repository Owner Role

**Responsibilities**:

1. ✅ Manage GitHub secrets in Settings
2. ✅ Configure new secrets for CI/CD needs (e.g., CODECOV_TOKEN)
3. ✅ Rotate Docker Hub credentials regularly
4. ✅ Review secret access logs
5. ✅ Manage production .env.production.SECURE file

**Current Status**:
- 4 secrets configured ✅
- CODECOV_TOKEN missing (needed for PR #132 fix) ⚠️

### CI/CD Pipeline Role

**Automated Tasks**:

1. Scan commits for hardcoded secrets (Gitleaks)
2. Verify no secrets in pull requests
3. Prevent merge if secrets detected
4. Validate SECRET_KEY format before Docker start
5. Upload coverage reports via CODECOV_TOKEN (pending setup)

**Current Status**:
- ✅ Secret scanning active on all branches
- ✅ Pre-commit hooks enforcing standards
- ⏳ Coverage token uploads blocked (awaiting CODECOV_TOKEN)

### Developer Role

**Responsibilities**:

1. Generate secure credentials locally
2. Copy .env.example to .env and populate
3. Never commit .env files
4. Use DOCKER.ps1 for validated configuration
5. Report any security issues

**Current Protections**:
- ✅ .env files in .gitignore
- ✅ Pre-commit hooks prevent accidental secrets
- ✅ Gitleaks scanning catches mistakes

---

## Known Secrets in Repository

### Allowlisted (Intentional)

None currently listed in `.secrets.baseline`.

### Not Found (Good)

- No hardcoded API keys
- No hardcoded passwords
- No private credentials in version control
- No leaked environment variable values

---

## Required Next Actions

### 🔴 IMMEDIATE (This Week)

1. **Create CODECOV_TOKEN Secret**
   - Get token from: https://codecov.io/
   - Go to: GitHub Repo Settings → Secrets and variables → Actions
   - Add new secret: `CODECOV_TOKEN` = `<token>`
   - Purpose: Enable coverage report uploads from CI

2. **Verify Production Secrets**
   - Confirm `.env.production.SECURE` file exists (created Jan 9)
   - Verify file is in .gitignore
   - Check permissions are restricted

### 🟡 RECOMMENDED (This Month)

1. **Add ADMIN_GH_PAT Secret** (Optional but helpful)
   - Create GitHub Personal Access Token (classic, `repo` scope)
   - Add to GitHub secrets as `ADMIN_GH_PAT`
   - Purpose: Enable admin operations in CI workflows

2. **Review Existing Secrets**
   - Verify `CI_MONITOR_TOKEN` still needed
   - Check `VASILEIOSSAMARAS` secret purpose
   - Document all secret purposes in repository

3. **Create Secret Rotation Policy**
   - Set calendar reminder for quarterly rotation
   - Document rotation procedures
   - Plan for key management system

---

## Security Best Practices

### ✅ Currently Implemented

1. **No Default Secrets** - Requires explicit configuration
2. **Multi-Layer Validation** - Docker, backend, CI all validate
3. **Automatic Scanning** - Gitleaks + detect-secrets in pre-commit and CI
4. **Gitignore Protection** - .env files protected from accidental commits
5. **Documentation** - Clear templates and examples provided
6. **Enforcement** - Application fails to start with weak keys

### 📋 To Implement

1. **Secret Rotation Schedule**
   - Quarterly rotation for DOCKERHUB_TOKEN
   - Annual rotation for CODECOV_TOKEN
   - Post-incident rotation for compromised secrets

2. **Audit Trail**
   - Log who accessed secrets
   - Track when secrets were rotated
   - Monitor for unusual access patterns

3. **Incident Response Plan**
   - Document steps for compromised secret
   - Define notification procedures
   - Plan for key revocation

---

## Deployment Secret Configuration

### Docker Deployment

**Step 1**: Create .env file

```bash
cp .env.example .env
```

**Step 2**: Update with secure values

```env
SECRET_KEY=<generated-random-64-char-key>
AUTH_ENABLED=True
AUTH_MODE=permissive
DEFAULT_ADMIN_EMAIL=your.email@company.com
DEFAULT_ADMIN_PASSWORD=<secure-password>
```

**Step 3**: Start with validation

```bash
.\DOCKER.ps1 -Start  # Validates SECRET_KEY automatically
```

### Production Deployment

**Step 1**: Create .env.production.SECURE

```bash
cp .env.production.example .env.production.SECURE
```

**Step 2**: Configure with strong credentials

```env
SECRET_KEY=<very-long-random-64+-char-key>
SECRET_KEY_STRICT_ENFORCEMENT=1
AUTH_MODE=strict
POSTGRES_PASSWORD=<very-strong-password>
DEFAULT_ADMIN_PASSWORD=<very-strong-password>
```

**Step 3**: Transfer to production host (secure channel only)

```bash
# Use secure transfer method (SCP, SFTP, password manager, etc.)
# NEVER commit or email this file
```

**Step 4**: Verify permissions

```bash
chmod 600 .env.production.SECURE
ls -la .env.production.SECURE  # Should be: -rw------- (600)
```

---

## Testing & Validation

### Verify Secret Scanning

```bash
# Test that Gitleaks catches hardcoded secrets
echo "FAKE_API_KEY=sk_test_123456789" >> test_secret.txt
git add test_secret.txt
git commit -m "test"  # Should fail with Gitleaks error
git reset HEAD~1
rm test_secret.txt
```

### Validate SECRET_KEY Format

```bash
# Test strong key acceptance
python -c "from backend.config import get_secret_key; print('✓ Valid key')"

# Test weak key rejection (will raise error)
export SECRET_KEY="change-me"
python -c "from backend.config import get_secret_key"  # Will fail
```

### Test Docker Validation

```bash
# Valid SECRET_KEY
echo "SECRET_KEY=<your-64-char-key>" > .env
.\DOCKER.ps1 -Start  # Succeeds

# Weak SECRET_KEY
echo "SECRET_KEY=placeholder" > .env
.\DOCKER.ps1 -Start  # Fails with validation error
```

---

## Summary Dashboard

| Aspect | Status | Notes |
|--------|--------|-------|
| **GitHub Secrets** | 🟡 4/5 | Missing CODECOV_TOKEN |
| **Secret Scanning** | ✅ Active | Gitleaks + detect-secrets |
| **Pre-commit Hooks** | ✅ Enforced | Prevents secret commits |
| **LOCAL .env Protection** | ✅ Complete | Gitignore enforced |
| **Production Secrets** | ✅ Secure | .env.production.SECURE created |
| **SECRET_KEY Validation** | ✅ Multi-layer | Docker + backend + CI |
| **Documentation** | ✅ Complete | Security guide available |
| **Incident Response** | ⚠️ Partial | Policy needed |
| **Audit Trail** | ⚠️ Limited | Manual logging only |

---

## Contact & Support

**For Secret Management Questions**:

1. **Development Issues**: Check `docs/SECURITY_GUIDE_COMPLETE.md`
2. **CI/CD Issues**: Check `.github/workflows/ci-cd-pipeline.yml`
3. **Production Deployment**: Check `docs/deployment/PRODUCTION_DOCKER_GUIDE.md`

**Emergency Secret Rotation**:

1. Create new credential
2. Update GitHub secret
3. Update local .env file
4. Rotate production .env.production.SECURE
5. Document in incident log

---

**Document Status**: Ready for deployment
**Last Review**: January 10, 2026
**Next Review**: March 10, 2026 (Quarterly)
