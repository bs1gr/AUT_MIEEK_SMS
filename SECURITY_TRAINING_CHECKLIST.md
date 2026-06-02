# Security Training Checklist - SMS Team

**Purpose:** Ensure all team members understand security practices  
**Audience:** All developers, DevOps engineers, product managers  
**Version:** 1.0  
**Last Updated:** 2026-06-02

---

## Onboarding Checklist (New Team Members)

### Week 1: Foundation

**Monday - Getting Started**
- [ ] Read this document (20 min)
- [ ] Read `SECURITY.md` (30 min)
- [ ] Review `SECURITY_AUDIT_COMPLETE.md` (15 min)
- [ ] Install pre-commit hooks (5 min)
  ```bash
  pre-commit install
  ```
- [ ] Verify hooks work (5 min)
  ```bash
  pre-commit run --all-files
  ```

**Tuesday - Understanding Vulnerabilities**
- [ ] Study path injection (CWE-22) - 15 min
  - Read: `backend/security/path_validation.py`
  - Understand: Why filename validation matters
  - Test: Run `pytest backend/tests/test_control_path_traversal.py`

- [ ] Study SQL injection (CWE-89) - 15 min
  - Review: `backend/routers/control/database.py`
  - Verify: All queries use parameterization
  - Never: Concatenate user input into SQL

- [ ] Study sensitive data handling - 15 min
  - Review: `fix_admin_account.py`
  - Verify: No credentials in logs
  - Know: Where secrets are stored (env vars only)

**Wednesday - Code Review Focus**
- [ ] Read `SECURITY_HEADERS_CONFIG.md` (20 min)
- [ ] Understand OWASP Top 10 (30 min)
- [ ] Create review checklist from `SECURITY_RELEASE_CHECKLIST.md` (10 min)
- [ ] Watch: OWASP Top 10 Video (optional, 15 min)
  - https://www.youtube.com/watch?v=BjmBbvvEQGA

**Thursday - Incident Response**
- [ ] Read `SECURITY_INCIDENT_RESPONSE.md` (30 min)
- [ ] Know: Who to contact for security issues
- [ ] Understand: Classification levels
- [ ] Know: What to do if you find a vulnerability

**Friday - Practice**
- [ ] Find and report 3 example vulnerabilities (from this codebase)
  ```bash
  # Prompt for practice:
  # 1. Find a place where path validation is used
  # 2. Find a SQL query with parameterization
  # 3. Find where secrets are managed
  ```
- [ ] Complete security quiz (online, 20 min)
- [ ] Ask security lead any questions
- [ ] Sign off on security agreement

---

## Monthly Security Training

### Week 1 of Each Month

**Topic Rotation:**

| Month | Topic | Trainer | Duration |
|-------|-------|---------|----------|
| Jan | OWASP Top 10 Overview | Security Lead | 60 min |
| Feb | Secure Coding Practices | Tech Lead | 45 min |
| Mar | Authentication & Authorization | Security Lead | 45 min |
| Apr | Cryptography Basics | Tech Lead | 30 min |
| May | Incident Response Drill | Security Lead | 60 min |
| Jun | Dependency Security | DevOps Lead | 45 min |
| Jul | API Security | Tech Lead | 45 min |
| Aug | Cloud Security | DevOps Lead | 45 min |
| Sep | Security Testing | QA Lead | 45 min |
| Oct | Threat Modeling | Security Lead | 60 min |
| Nov | GDPR/Privacy | Legal | 30 min |
| Dec | Year-end Security Review | Security Lead | 90 min |

### Session Format

1. **Presentation** (20-30 min)
2. **Case Study** (10-15 min)
3. **Q&A** (10-15 min)
4. **Quiz/Assessment** (10 min)

### Recording & Materials

- [ ] Video recorded for those who can't attend
- [ ] Slides posted to shared drive
- [ ] Quiz answers reviewed
- [ ] Attendance tracked
- [ ] Certificates issued (optional)

---

## Role-Specific Training

### For Developers

**Required Knowledge:**
- [ ] OWASP Top 10
- [ ] Secure coding practices
- [ ] How to use security libraries (passlib, cryptography)
- [ ] Path validation techniques
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] How to report security issues
- [ ] Code review from security perspective

**Annual Training Hours:** 8 hours

**Certifications to Consider:**
- [ ] Secure Coding in [Language] (Coursera)
- [ ] OWASP Secure Coder (online)

**Resources:**
- [ ] OWASP Cheat Sheets
- [ ] CWE/SANS Top 25
- [ ] Security-focused blogs (OWASP, NCC Group)

---

### For DevOps/Infrastructure

**Required Knowledge:**
- [ ] Secure deployment practices
- [ ] HTTPS/TLS configuration
- [ ] Secret management
- [ ] Access control & IAM
- [ ] Container security
- [ ] Network security
- [ ] Backup & disaster recovery
- [ ] Security monitoring
- [ ] Incident response procedures

**Annual Training Hours:** 12 hours

**Certifications to Consider:**
- [ ] Kubernetes Security (Linux Academy)
- [ ] Docker Security (online)
- [ ] Cloud Security (AWS/Azure/GCP)

**Resources:**
- [ ] NIST Cybersecurity Framework
- [ ] CIS Benchmarks
- [ ] Cloud provider security docs

---

### For Product/Project Managers

**Required Knowledge:**
- [ ] OWASP Top 10 (high level)
- [ ] Security requirements process
- [ ] Privacy considerations
- [ ] Regulatory compliance basics
- [ ] Security incident impact
- [ ] How to talk to developers about security
- [ ] Security metrics (how to measure)

**Annual Training Hours:** 4 hours

**Certifications to Consider:**
- [ ] Product Management for Security (Coursera)
- [ ] Privacy by Design (IAPP)

**Resources:**
- [ ] OWASP Top 10 for Business
- [ ] Privacy by design principles
- [ ] Security metrics frameworks

---

## Skill Assessment

### Baseline Assessment (Month 1)

```
Skill | Level | Evidence | Date
------|-------|----------|-----
Path Validation | [ ] Know [ ] Apply | | 
SQL Injection | [ ] Know [ ] Apply | | 
XSS Prevention | [ ] Know [ ] Apply | | 
Authentication | [ ] Know [ ] Apply | | 
HTTPS/TLS | [ ] Know [ ] Apply | | 
Secrets Management | [ ] Know [ ] Apply | | 
Incident Response | [ ] Know [ ] Apply | | 
```

### Quarterly Review

- [ ] Assess growth vs. baseline
- [ ] Identify training gaps
- [ ] Adjust training plan
- [ ] Set new goals

---

## Security Exercises

### Monthly Code Review Drill

**Format:** 30 minutes, review 5-10 code snippets

**Objective:** Identify security issues

**Example Exercises:**

```python
# Exercise 1: Find the vulnerability
def save_user_data(filename, data):
    with open(f"/uploads/{filename}", "w") as f:
        f.write(data)
    return "Saved"

# Answer: Path traversal - no validation of filename
# Fix: Use validate_filename(filename)
```

```python
# Exercise 2: Find the vulnerability
def search_users(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    return db.execute(query)

# Answer: SQL injection - string concatenation
# Fix: Use parameterized query: SELECT * FROM users WHERE email = %s
```

```javascript
// Exercise 3: Find the vulnerability
function displayUser(id) {
    document.getElementById("user").innerHTML = getUserData(id).name;
}

// Answer: XSS - innerHTML with unsanitized user data
// Fix: Use textContent or sanitize input
```

### Quarterly Incident Response Drill

**Scenario-based:** Simulate a security incident

**Format:**
1. **Brief:** "A vulnerability was found in..."
2. **Respond:** Team members follow procedures
3. **Debrief:** What went well? What could improve?

**Example Scenarios:**
- [ ] SQL injection found in production
- [ ] Credentials exposed in git history
- [ ] Dependency vulnerability discovered
- [ ] DDoS attack detected
- [ ] Malicious user activity detected

---

## Certification & Recognition

### Company Certifications

- [ ] Security-Aware Developer Certificate
- [ ] Security Code Reviewer Certification
- [ ] Incident Response Team Member Badge

**Requirements:**
- Complete all onboarding training
- Pass security quiz (80%+)
- Contribute to security improvements (1 per year)
- Maintain current knowledge (annual)

### Recognition Program

- [ ] Highlight security improvements in team meetings
- [ ] Feature security stories in company newsletter
- [ ] Public recognition for security findings
- [ ] Annual security champion award
- [ ] Professional development budget (dedicated to security)

---

## Mandatory Reading

### All Team Members
- [ ] SECURITY.md (8 KB, 20 min)
- [ ] OWASP Top 10 (15 min)
- [ ] SECURITY_AUDIT_COMPLETE.md (6 KB, 15 min)

### Developers
- [ ] Secure Coding Cheat Sheet (20 min)
- [ ] OWASP Path Traversal (10 min)
- [ ] OWASP SQL Injection (15 min)
- [ ] backend/security/path_validation.py (review code, 15 min)

### DevOps
- [ ] DEPLOYMENT_SECURITY_RUNBOOK.md (30 KB, 45 min)
- [ ] SECURITY_HEADERS_CONFIG.md (20 KB, 30 min)
- [ ] NIST Secure Configuration Guide (30 min)

### Product/Project Managers
- [ ] SECURITY_RELEASE_CHECKLIST.md (6 KB, 15 min)
- [ ] OWASP Top 10 (Business perspective, 20 min)
- [ ] Privacy by Design (20 min)

---

## Tracking & Compliance

### Training Log Template

```
| Person | Date | Topic | Duration | Passed? | Notes |
|--------|------|-------|----------|---------|-------|
| Alice | 2026-06-01 | OWASP Top 10 | 60 min | ✅ 92% | |
| Bob | 2026-06-01 | Path Validation | 45 min | ✅ 88% | |
```

### Metrics

- Training completion rate (target: 100%)
- Quiz pass rate (target: 85%+)
- Security findings per developer (target: 1+ per year)
- Incident response time (target: < 4 hours for High)
- Vulnerability fix time (target: < 7 days for High)

### Annual Report

- [ ] Total training hours delivered
- [ ] Security incidents and outcomes
- [ ] Vulnerability fixes
- [ ] Team skill assessment
- [ ] Areas for improvement
- [ ] Budget for next year

---

## Resources

### Online Training
- OWASP: https://owasp.org/
- Coursera Security Courses: https://www.coursera.org/
- Pluralsight: https://www.pluralsight.com/
- Cybrary: https://www.cybrary.it/
- TryHackMe: https://tryhackme.com/

### Certifications
- **CEH** (Certified Ethical Hacker) - 3 years, hands-on focus
- **CISSP** (Certified Information Systems Security Professional) - 5 years exp required
- **Security+** (CompTIA) - Entry level, 2 years IT experience
- **CCNA Security** (Cisco) - Network security focus

### Books
- *The Web Application Hacker's Handbook* - Stuttard & Pinto
- *OWASP Testing Guide* - Free online
- *The Art of Software Security Testing* - Free online
- *Security Engineering* - Anderson

### Podcasts
- Security Now (weekly, 90 min)
- Darknet Diaries (bi-weekly, 30-60 min)
- The CyberWire (daily, 15 min)

---

## Competency Matrix

### Junior Developer
- [ ] Knows OWASP Top 10
- [ ] Can identify obvious vulnerabilities
- [ ] Uses validation functions correctly
- [ ] Asks security questions in code review
- **Training:** 20 hours/year

### Senior Developer
- [ ] Expert in secure coding
- [ ] Reviews others' code for security
- [ ] Teaches security concepts
- [ ] Contributes to security tools
- **Training:** 15 hours/year (self-directed)

### Security Lead
- [ ] Expert in all areas
- [ ] Trains team members
- [ ] Handles incidents
- [ ] Sets security policies
- **Training:** 30 hours/year

---

## Sign-Off

**Team Member Agreement**

I acknowledge that I have:
- [ ] Read this document
- [ ] Understood my security responsibilities
- [ ] Completed baseline training
- [ ] Will follow security practices
- [ ] Will report security issues promptly
- [ ] Will maintain confidentiality of security information

**Name:** ________________  
**Date:** ________________  
**Manager:** ________________  

---

**Last Updated:** 2026-06-02  
**Status:** ACTIVE  
**Review Date:** 2026-09-02
