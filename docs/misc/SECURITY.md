# Security Policy - Student Management System

## Overview

This document outlines the security practices, policies, and procedures for the Student Management System (SMS) vv1.18.24+.

---

## Reporting Security Vulnerabilities

**Please DO NOT open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability, please email: **[SECURITY_CONTACT@example.com]**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will respond within 48 hours and work with you to resolve the issue responsibly.

---

## Security Standards

### OWASP Top 10 Compliance

| Rank | Category | Status | Details |
|------|----------|--------|---------|
| A01 | Injection | ✅ PROTECTED | Path traversal validation, parameterized SQL queries |
| A02 | Authentication | ✅ PROTECTED | JWT tokens, rate limiting, lockout mechanisms |
| A03 | Sensitive Data | ✅ PROTECTED | Encrypted passwords, no credential logging |
| A04 | XML External Entities | ✅ N/A | No XML processing in application |
| A05 | Broken Access Control | ✅ PROTECTED | RBAC enforcement, permission checks |
| A06 | Insecure Config | ✅ PROTECTED | Env vars for secrets, secure defaults |
| A07 | Identification/Auth | ✅ PROTECTED | Session validation, CSRF tokens |
| A08 | Insecure Software | ✅ PROTECTED | Dependency scanning, security patches |
| A09 | Logging/Monitoring | ✅ PROTECTED | Audit logs, no sensitive data logged |
| A10 | Server-Side Request | ✅ PROTECTED | URL validation, request timeouts |

---

## Dependency Management

### Automated Security Scanning

#### Backend (Python)
- **Tool:** `safety` + `pip-audit`
- **Frequency:** Every commit (CI/CD)
- **Threshold:** No vulnerabilities (all levels)
- **Command:** `pip-audit` or `safety check --file requirements.txt`

#### Frontend (JavaScript)
- **Tool:** `npm audit`
- **Frequency:** Every commit (CI/CD)
- **Threshold:** No moderate+ vulnerabilities
- **Command:** `npm audit --audit-level=moderate`

### Dependency Updates

1. **Automated:** Dependabot PRs for security updates
2. **Manual:** Monthly dependency review
3. **Testing:** All tests must pass after updates
4. **Approval:** Security lead sign-off required

### Current Secure Versions

| Package | Version | CVE Fixed | Status |
|---------|---------|-----------|--------|
| cryptography | 46.0.7 | CVE-2026-39892 | ✅ |
| protobuf | 6.x | CVE-2026-0994 | ✅ |
| python-multipart | 0.0.27 | CVE-2024-24762 | ✅ |
| virtualenv | 20.36.1+ | CVE-2026-22702 | ✅ |

---

## Code Security Practices

### Path Traversal Prevention

All file operations are protected via `backend/security/path_validation.py`:

```python
from backend.security.path_validation import validate_filename

# Example: Validating user input
try:
    safe_filename = validate_filename(user_input, [".sql", ".sql.gz"])
    filepath = backup_dir / safe_filename
except ValueError as e:
    # Path traversal attempt detected
    logger.warning(f"Invalid path: {e}")
```

**Test Coverage:** `backend/tests/test_control_path_traversal.py` (3/3 passing)

### SQL Injection Prevention

All database queries use parameterized statements:

```python
# ✅ SAFE - Parameterized
result = conn.execute("SELECT * FROM users WHERE email = %s", (email,))

# ❌ UNSAFE - String concatenation (NEVER DO THIS)
# result = conn.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

### Secret Management

Secrets are **NEVER** hardcoded or logged:

```python
# ✅ CORRECT - Environment variables
password = os.environ.get('DATABASE_PASSWORD')

# ❌ WRONG - Hardcoded credentials
password = 'super_secret_123'  # NEVER!

# ❌ WRONG - Logged credentials
logger.info(f"Password: {password}")  # NEVER!
```

### Authentication & Authorization

- ✅ JWT tokens with 24-hour expiration
- ✅ CSRF token protection on all state-changing operations
- ✅ Rate limiting: 5 login attempts per 15 minutes
- ✅ Password requirements: Min 12 characters, uppercase, number, special char
- ✅ Role-based access control (RBAC) enforced on all routes

---

## Pre-Commit Security Checks

### Setup

```bash
# Install pre-commit framework
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

### Enabled Checks

- ✅ **pip-audit:** Check backend dependencies
- ✅ **npm audit:** Check frontend dependencies
- ✅ **detect-secrets:** Scan for hardcoded secrets
- ✅ **No hardcoded credentials:** Pattern matching for passwords/tokens
- ✅ **No credential printing:** Pattern matching for print statements

---

## CI/CD Security Pipeline

### Phase 5: Security Scanning

**Runs on:** Every push to `main` and all PRs

#### Backend Security Checks
1. `safety check` - CVE database check
2. `pip-audit` - Additional vulnerability detection
3. `bandit` - Code security analysis

#### Frontend Security Checks
1. `npm audit --audit-level=moderate` - Dependency vulnerabilities
2. Fails if moderate+ vulnerabilities found

#### Path Traversal Tests
1. Run `test_control_path_traversal.py` explicitly
2. 3 scenarios covering path traversal attempts
3. All 3 must pass

**Workflow File:** `.github/workflows/ci-cd-pipeline.yml`

---

## Security Testing

### Unit Tests

```bash
# Run path traversal security tests
pytest backend/tests/test_control_path_traversal.py -v

# Expected result: 3 passed
```

### Manual Security Audit

```bash
# Check for hardcoded secrets
grep -r "password\|secret\|token" backend/ --include="*.py" | grep -v "environ\|hashed"

# Check for SQL injection vulnerabilities
grep -r "\.execute(" backend/ --include="*.py" | grep -v "?"

# Check for unsafe file operations
grep -r "open(" backend/ --include="*.py" | grep -v "validate"
```

---

## Incident Response

### Security Vulnerability Found

1. **Assessment:** Determine severity (CVSS score)
2. **Patch:** Create fix in private branch
3. **Testing:** Run full test suite + security tests
4. **Review:** Code review + security review
5. **Release:** Publish security patch
6. **Notification:** Inform users if needed

### Timeline

- **Critical (CVSS 9-10):** Patch within 24 hours
- **High (CVSS 7-8):** Patch within 7 days
- **Medium (CVSS 4-6):** Patch within 30 days
- **Low (CVSS 0-3):** Patch in next regular release

---

## Security Checklist for Releases

See **[SECURITY_RELEASE_CHECKLIST.md](SECURITY_RELEASE_CHECKLIST.md)** for:
- Pre-release security validation
- Manual security checks
- Dependency audit procedures
- Release sign-off template

---

## Third-Party Security Tools

### GitHub Code Scanning (CodeQL)

- **Workflow:** `.github/workflows/codeql.yml`
- **Frequency:** Weekly + on-demand
- **Alert Level:** Error severity blocks release
- **Configuration:** Automatic (GitHub default)

### Dependency Review

- **Workflow:** `.github/workflows/dependency-review.yml`
- **Triggers:** Every PR that modifies dependencies
- **Action:** Blocks merge if vulnerabilities detected

### Container Image Scanning (Trivy)

- **Workflow:** `.github/workflows/trivy-scan.yml`
- **When:** Before publishing Docker images
- **Threshold:** No high-severity vulnerabilities

---

## Security Documentation

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| [SECURITY_AUDIT_COMPLETE.md](SECURITY_AUDIT_COMPLETE.md) | Audit results & verification | After audits |
| [SECURITY_RELEASE_CHECKLIST.md](SECURITY_RELEASE_CHECKLIST.md) | Pre-release procedures | As needed |
| [SECURITY.md](SECURITY.md) | This document | Quarterly |

---

## References

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CWE Top 25:** https://cwe.mitre.org/top25/
- **CVSS Calculator:** https://www.first.org/cvss/calculator/3.1
- **CVE Database:** https://cve.mitre.org/

---

## Security Team

- **Lead:** [ASSIGN SECURITY LEAD]
- **Incident Response:** [ASSIGN RESPONDER]
- **Dependency Updates:** Automated via Dependabot + Manual Review

---

**Last Updated:** 2026-06-02  
**Version:** vv1.18.24  
**Status:** ACTIVE

