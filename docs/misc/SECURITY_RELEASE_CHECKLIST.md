# Security Release Checklist - SMS vvv1.18.25+

This checklist ensures every release meets security standards. **Must be completed before deploying to production.**

---

## Pre-Release Security Validation (Automated in CI/CD)

### ✅ Backend Dependency Scanning
- [ ] **Location:** `.github/workflows/ci-cd-pipeline.yml` → `security-scan-backend` job
- [ ] **Command:** `safety check --file requirements.txt`
- [ ] **Frequency:** Every push to main and PR
- [ ] **Action:** Fails pipeline if vulnerabilities detected
- [ ] **Run Locally:** `pip install safety && safety check --file backend/requirements.txt`

### ✅ Frontend Dependency Scanning  
- [ ] **Location:** `.github/workflows/ci-cd-pipeline.yml` → `security-scan-frontend` job
- [ ] **Command:** `npm audit --omit=dev --audit-level=moderate`
- [ ] **Frequency:** Every push to main and PR
- [ ] **Action:** Fails pipeline if moderate+ vulnerabilities detected
- [ ] **Run Locally:** `cd src/frontend && npm audit --omit=dev`

### ✅ Path Traversal Security Tests
- [ ] **Location:** `backend/tests/test_control_path_traversal.py`
- [ ] **Tests:** 3 scenarios covering backup operations
- [ ] **Execution:** Runs in `test-backend` job
- [ ] **Must Pass:** All 3 tests before release
- [ ] **Run Locally:** `pytest backend/tests/test_control_path_traversal.py -v`

### ✅ Security Code Scanning (GitHub)
- [ ] **Workflow:** `.github/workflows/codeql.yml`
- [ ] **Scope:** Python, JavaScript code analysis
- [ ] **Alert Level:** No alerts with "Error" severity
- [ ] **Frequency:** Weekly automated scans
- [ ] **Location:** Settings → Code Security → Code scanning alerts

---

## Manual Security Checks (Before Release)

### 1. Dependency Audit
```bash
# Backend dependencies
pip-audit  # Install: pip install pip-audit

# Frontend dependencies
cd src/frontend
npm audit --production
```

**Criteria:** No vulnerabilities with CVSS >= 5.0

---

### 2. Secret Scan
```bash
# Check for hardcoded secrets
grep -r "password" backend/ --include="*.py" | grep -v "hashed\|encrypt\|environ"
grep -r "secret" backend/ --include="*.py" | grep -v "SECRET\|key\|settings"
grep -r "token" backend/ --include="*.py" | grep -v "TOKEN\|JWT"
```

**Criteria:** No hardcoded credentials (only env var references)

---

### 3. SQL Injection Checks
```bash
# Look for unparameterized queries
grep -r "\.execute(" backend/ --include="*.py" | grep -v "conn.execute\|execute(" | head -20
```

**Criteria:** All database queries use parameter binding

---

### 4. Path Traversal Verification
```bash
# Run all path validation tests
pytest backend/tests/test_control_path_traversal.py -v

# Check for unsafe file operations
grep -r "open(" backend/ --include="*.py" | grep -v "validate_filename\|_find_existing" | head -10
```

**Criteria:** All tests pass, all file ops use validation

---

### 5. Logging Audit
```bash
# Check logs don't contain sensitive data
grep -r "print.*password\|print.*secret\|print.*token" . --include="*.py" | grep -v ".venv"
grep -r 'f".*{password\|f".*{secret\|f".*{token' . --include="*.py" | grep -v ".venv"
```

**Criteria:** No credentials in logs or console output

---

### 6. Permission Review
```bash
# Check file permissions on sensitive files
ls -la backend/security/
ls -la backend/config/
```

**Criteria:** Configuration files not world-readable

---

## Release Sign-Off Template

```markdown
## Security Release Sign-Off - vvv1.18.25

**Release Date:** [DATE]  
**Releaser:** [NAME]

### Automated Checks
- [ ] CI/CD pipeline passed (backend + frontend security scans)
- [ ] CodeQL scan: No errors
- [ ] Path traversal tests: 3/3 passing
- [ ] No merge conflicts with security fixes

### Manual Verification
- [ ] pip-audit passed (no vulnerabilities)
- [ ] npm audit passed (no moderate+ vulnerabilities)
- [ ] Secret scan: No hardcoded credentials
- [ ] SQL injection review: All queries parameterized
- [ ] Logging audit: No sensitive data in logs
- [ ] File permissions: Verified

### Dependencies Updated
- [ ] Backend: Latest secure versions
- [ ] Frontend: Latest secure versions
- [ ] CVE tracking: All known issues patched

### Documentation
- [ ] SECURITY.md updated
- [ ] CHANGELOG.md notes security fixes
- [ ] Release notes include security summary

**Approval:** ✅ Safe to deploy to production
```

---

## Continuous Monitoring

### Weekly Tasks
1. Review GitHub code scanning alerts: Settings → Code Security
2. Check for new CVE announcements: https://cve.mitre.org/
3. Review dependency updates: Dependabot suggestions

### Monthly Tasks
1. Run full security audit:
   ```bash
   pip-audit
   npm audit (frontend)
   pytest backend/tests/test_control_path_traversal.py
   ```
2. Update security documentation
3. Review access logs for suspicious activity

### Quarterly Tasks
1. Comprehensive security review
2. Penetration testing (if budget allows)
3. Security training for team
4. Update SECURITY.md with lessons learned

---

## CI/CD Security Workflows

### Workflows Currently Running

| Workflow | Frequency | Purpose |
|----------|-----------|---------|
| `ci-cd-pipeline.yml` | Every push + PR | Security scans, tests, type checking |
| `codeql.yml` | Weekly + on-demand | CodeQL code scanning |
| `dependency-review.yml` | Every PR | Dependency manifest changes |
| `trivy-scan.yml` | On-demand | Container image scanning |
| `fetch-code-scanning-sarif.yml` | Daily | Export CodeQL results |

### Adding New Security Checks

To add a new security check to CI/CD:

1. **Location:** `.github/workflows/ci-cd-pipeline.yml`
2. **Phase 5:** Security Scanning section
3. **Template:**
   ```yaml
   - name: Run [Security Tool]
     run: |
       [command]
   
   - name: Check [Tool] results
     if: failure()
     run: exit 1
   ```

---

## Security Contacts

- **Security Lead:** [TO BE ASSIGNED]
- **Incident Response:** [TO BE ASSIGNED]
- **Dependency Updates:** Automated via Dependabot

---

## References

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CWE-22 (Path Traversal):** https://cwe.mitre.org/data/definitions/22.html
- **CWE-532 (Sensitive Logging):** https://cwe.mitre.org/data/definitions/532.html
- **CVE Database:** https://cve.mitre.org/

---

**Last Updated:** 2026-06-02  
**Version:** vvv1.18.25  
**Status:** ACTIVE


