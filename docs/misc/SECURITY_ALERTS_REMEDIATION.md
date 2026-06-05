# Security Code Scanning Alerts - Remediation Plan

**Repository:** bs1gr/AUT_MIEEK_SMS  
**Scan Date:** 2026-06-01  
**Total Alerts:** 30 (29 errors, 1 warning)

---

## 📊 Alert Summary

| Severity | Count | Type | Action |
|----------|-------|------|--------|
| **Error** | 29 | Path Injection (23), CVE Dependencies (4), Logging Sensitive Data (1) | **CRITICAL** |
| **Warning** | 1 | Other | **Review** |

---

## 🔴 Critical Issues (29 Errors)

### 1. Path Injection Vulnerabilities (23 alerts)

**Affected Files:**
- `backend/services/database_manager.py` (18 occurrences)
- `backend/routers/control/maintenance.py` (5 occurrences)

**Issue:** User-controlled paths are used in file operations without proper validation/sanitization.

**Example Vulnerable Pattern:**
```python
# VULNERABLE
file_path = user_input_path  # Directly used in file operations
with open(file_path, 'r') as f:
    # ...
```

**Fix:**
```python
# SAFE - Validate and sanitize paths
from pathlib import Path
import os

def safe_file_operation(user_path: str, allowed_base_dir: Path):
    # Validate path stays within allowed directory
    user_path = Path(user_path).resolve()
    allowed_dir = allowed_base_dir.resolve()
    
    if not str(user_path).startswith(str(allowed_dir)):
        raise ValueError("Path traversal detected")
    
    if not user_path.exists():
        raise FileNotFoundError(f"File not found: {user_path}")
    
    return user_path
```

**Action Items:**
- [ ] Add path validation for all file operations
- [ ] Use `Path.resolve()` to canonicalize paths
- [ ] Implement whitelist of allowed directories
- [ ] Add unit tests for path traversal attempts

---

### 2. Clear-Text Logging of Sensitive Data (1 error)

**Affected File:** `fix_admin_account.py:62`

**Issue:** Sensitive information (passwords, credentials) logged without encryption.

**Vulnerable Code:**
```python
# Line 62 - VULNERABLE
print(f"Admin user updated: {email} ({', '.join(changed_fields)})")
# If changed_fields includes 'password', this logs the password!
```

**Fix:**
```python
# SAFE - Don't log sensitive fields
safe_fields = [f for f in changed_fields if f != 'password']
if safe_fields:
    logger.info(f"Admin user updated: {email} ({', '.join(safe_fields)})")
else:
    logger.info(f"Admin user updated: {email}")
```

**Action Items:**
- [ ] Audit all logging statements for sensitive data
- [ ] Create blocklist: password, token, secret, key, credential
- [ ] Use secure logging library (e.g., python-json-logger)
- [ ] Never log full request/response bodies with auth data

---

### 3. CVE Dependencies (4 errors)

**Affected File:** `frontend/package-lock.json` and `backend/requirements.txt`

**Vulnerable Dependencies:**
1. **CVE-2026-40175** (Frontend)
2. **CVE-2025-62718** (Frontend)
3. **CVE-2026-32597** (Backend)

**Action Items:**
- [ ] Run `npm audit fix` in frontend directory
- [ ] Run `pip install --upgrade` for vulnerable packages
- [ ] Check if upgrades introduce breaking changes
- [ ] Test thoroughly after dependency updates
- [ ] Use lock file pinning to prevent regressing

---

## 🟡 Minor Issues (1 Warning)

**Recommendation:** Review and determine if action is needed.

---

## 🛠️ Remediation Priority

### Phase 1: Critical Security Fixes (This Release)
- **Priority 1:** Fix path injection vulnerabilities (HIGH RISK)
- **Priority 2:** Fix CVE dependencies (HIGH RISK)
- **Priority 3:** Fix sensitive data logging (MEDIUM RISK)

### Timeline
- **Immediate (Week 1):** Patch CVE dependencies
- **Short-term (Week 2):** Fix path injection vulnerabilities
- **Short-term (Week 2):** Fix logging issues

---

## ✅ Remediation Checklist

### Path Injection Fixes
- [ ] **database_manager.py** - Add path validation for all file operations
  - Lines: 64, 71, 81, 82, 145, 209, 212, 481, 491, 512, 518, 521, 523, 524, 535, 555, 563, 670, 673
  - Action: Wrap file paths in `safe_path()` function
  
- [ ] **control/maintenance.py** - Add path validation
  - Lines: 64, 145, 209, 212, 669
  - Action: Wrap file paths in `safe_path()` function

### Dependency Updates
- [ ] Frontend: Run `npm audit fix` and test
- [ ] Backend: Update `requirements.txt` to fix CVE-2026-32597
- [ ] Re-scan after updates

### Logging Fixes
- [ ] **fix_admin_account.py** - Remove password from logs
  - Line 62: Filter sensitive fields before logging
  - Action: Create blocklist of sensitive field names

### Testing
- [ ] Add security test cases for path traversal
- [ ] Add test cases for sensitive data in logs
- [ ] Run full test suite after fixes
- [ ] Re-run code scanning to verify fixes

---

## 🔒 Security Best Practices to Prevent Future Issues

### 1. Input Validation
```python
from pathlib import Path

def validate_path(user_input: str, base_dir: Path) -> Path:
    """Validate user path stays within base_dir"""
    user_path = Path(user_input).resolve()
    base_path = base_dir.resolve()
    
    if not str(user_path).startswith(str(base_path)):
        raise ValueError("Invalid path: outside allowed directory")
    
    return user_path
```

### 2. Secure Logging
```python
import logging
logger = logging.getLogger(__name__)

SENSITIVE_FIELDS = {'password', 'token', 'secret', 'key', 'credential', 'api_key'}

def log_safe(message: str, data: dict = None):
    """Log message with sensitive fields filtered"""
    if data:
        safe_data = {k: v for k, v in data.items() if k not in SENSITIVE_FIELDS}
        logger.info(f"{message}: {safe_data}")
    else:
        logger.info(message)
```

### 3. Dependency Security
- Pin specific versions in requirements.txt
- Use `pip-audit` regularly
- Run `npm audit` before each release
- Use tools like Dependabot for automatic alerts

---

## 📈 Next Steps

1. **This Week:**
   - [ ] Patch CVE dependencies
   - [ ] Add path validation to database_manager.py
   - [ ] Fix logging in fix_admin_account.py

2. **Next Week:**
   - [ ] Complete path injection fixes across all files
   - [ ] Run full test suite
   - [ ] Re-scan with GitHub code scanning
   - [ ] Verify all alerts resolved

3. **Ongoing:**
   - [ ] Add pre-commit hooks for security checks
   - [ ] Use linters that catch these issues
   - [ ] Regular dependency audits
   - [ ] Security code review process

---

## 📞 References

- **OWASP Path Traversal:** https://owasp.org/www-community/attacks/Path_Traversal
- **OWASP Logging:** https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/
- **CWE-22 (Path Traversal):** https://cwe.mitre.org/data/definitions/22.html
- **CWE-532 (Sensitive Data Logging):** https://cwe.mitre.org/data/definitions/532.html

---

**Status:** Ready for remediation  
**Estimated Effort:** 2-3 days  
**Priority:** HIGH - Should be fixed before production release

