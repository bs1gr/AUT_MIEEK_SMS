# Security Incident Response Playbook - SMS

**Version:** 1.0  
**Last Updated:** 2026-06-02  
**Status:** ACTIVE

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Classification](#incident-classification)
3. [Response Procedures](#response-procedures)
4. [Escalation Matrix](#escalation-matrix)
5. [Communication Plan](#communication-plan)
6. [Post-Incident Review](#post-incident-review)
7. [Contact Directory](#contact-directory)

---

## Overview

This playbook provides step-by-step guidance for responding to security incidents affecting the Student Management System.

### Incident Response Team Roles

| Role | Responsibility | Contact |
|------|-----------------|---------|
| **Security Lead** | Incident coordination, severity assessment | [TBD] |
| **Technical Lead** | System investigation, mitigation | [TBD] |
| **Communications** | Internal/external notifications | [TBD] |
| **Legal/Compliance** | Regulatory obligations, documentation | [TBD] |

---

## Incident Classification

### Severity Levels

| Level | CVSS | Description | Response Time | Example |
|-------|------|-------------|---|----------|
| **Critical** | 9-10 | Active breach, data exfiltration, system down | 1 hour | SQL injection attack in production |
| **High** | 7-8 | Vulnerability allowing unauthorized access | 4 hours | Privilege escalation discovered |
| **Medium** | 4-6 | Security issue with potential impact | 1 day | Unpatched dependency with workaround |
| **Low** | 0-3 | Minor issue, low risk | 1 week | Hardcoded secret in test file |

### Incident Types

#### A. Data Breach
- Unauthorized access to sensitive data
- Customer PII exposed
- Database credentials compromised

#### B. System Compromise
- Server/application hacked
- Malware detected
- Denial of Service attack

#### C. Vulnerability Discovery
- Unpatched CVE found in dependencies
- Code review finds security issue
- Penetration test discovers weakness

#### D. Configuration Error
- Secrets exposed in logs
- Permissions misconfigured
- Insecure defaults left in place

#### E. Supply Chain Risk
- Compromised dependency package
- Infected container image
- Malicious pull request

---

## Response Procedures

### Phase 1: Detection & Initial Response (0-15 minutes)

#### Step 1.1: Detect Incident
- [ ] Monitor sources:
  - GitHub code scanning alerts
  - Dependabot notifications
  - Security tools alerts (Trivy, Bandit)
  - User reports via security@[domain].com
  - Log anomalies (failed auth, suspicious queries)

#### Step 1.2: Initial Assessment
```bash
# Verify incident is real (not false positive)
- Check alert source and context
- Review recent changes via: git log --oneline -20
- Check system logs for correlation
- Assess impact scope (how many users/systems affected?)
```

#### Step 1.3: Activate Response Team
- [ ] Contact Security Lead
- [ ] Assess severity using Incident Classification table
- [ ] Create incident ticket: `SECURITY-[DATE]-[ID]`
- [ ] Document initial findings

**Escalation:** If Critical, activate War Room immediately

---

### Phase 2: Investigation & Containment (15-60 minutes)

#### Step 2.1: Isolate & Contain
```bash
# DO NOT shut down systems without approval
# Goal: Prevent spread while preserving evidence

For data breach:
- [ ] Identify affected data scope
- [ ] Check backup integrity
- [ ] Review access logs (who accessed what/when?)
- [ ] Preserve evidence (don't overwrite logs)

For code vulnerability:
- [ ] Review code changes: git diff [vulnerable-commit]^
- [ ] Check if vulnerability is exploited (search logs)
- [ ] Identify similar patterns in codebase
- [ ] Prepare patch

For compromised credentials:
- [ ] Rotate affected credentials immediately
- [ ] Revoke access tokens (if applicable)
- [ ] Check credential usage in logs
- [ ] Force password reset for affected users
```

#### Step 2.2: Assess Impact
- [ ] Systems affected
- [ ] Data exposed (if any)
- [ ] Users impacted (count)
- [ ] Duration of exposure
- [ ] Likelihood of exploitation

**Example Documentation:**
```
Incident: SQL Injection in user search (SECURITY-2026-06-001)
Impact: All user records potentially exposed
Duration: 2024-06-01 10:30 to 10:45 (15 minutes)
Affected: All users of SMS vvv1.18.25
Exploitation: No logs of malicious queries detected
```

---

### Phase 3: Remediation (1-24 hours depending on severity)

#### Step 3.1: Develop Fix
```bash
# For code vulnerabilities
1. Create feature branch: git checkout -b security/fix-[issue-id]
2. Implement fix (reference this playbook in commit)
3. Add/update security tests
4. Commit with security label: git commit -m "fix(security): [description]"

# For dependency vulnerabilities
1. Update package: pip install --upgrade [package]
2. Run tests: pytest
3. Run security checks: pip-audit, safety check
4. Commit: git commit -m "fix(deps): update [package] for CVE-[id]"

# For configuration issues
1. Fix configuration
2. Audit for similar issues
3. Update deployment docs
4. Test in staging first
```

#### Step 3.2: Test Remediation
- [ ] Run full test suite: `pytest`
- [ ] Run security tests: `pytest backend/tests/test_control_path_traversal.py`
- [ ] Run dependency checks: `pip-audit`, `npm audit`
- [ ] Verify fix is effective (re-test vulnerability)

#### Step 3.3: Deploy Fix
- [ ] Approval from Security Lead + 2 other engineers
- [ ] Deploy to staging first
- [ ] Test in staging (24 hours preferred)
- [ ] Deploy to production during low-traffic window
- [ ] Verify fix is working in production

---

### Phase 4: Communication (Ongoing)

#### Step 4.1: Internal Notification
```markdown
**To:** Engineering Team, Product Team  
**Subject:** SECURITY: [Incident Name]

**Status:** [DETECTED / INVESTIGATING / CONTAINED / RESOLVED]

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW]

**Summary:** [One sentence description]

**Impact:** [Who is affected, what data/systems]

**Status:** [What we're doing now]

**ETA:** [When it will be resolved]

**Action for you:** [If any - e.g., reset password, update systems]
```

#### Step 4.2: External Notification (if required)
**Notification triggered if:**
- Data breach with PII exposed
- Service unavailable > 4 hours
- Regulatory requirements apply

**Required by law (varies by jurisdiction):**
- GDPR: 72 hours
- CCPA: "without unreasonable delay"
- Others: Check local requirements

**Notification should include:**
- What happened (brief)
- When it happened (date/time range)
- What data affected (if any)
- What we're doing about it
- How users can protect themselves
- Where to get more info

---

### Phase 5: Post-Incident Review (24-72 hours after resolution)

#### Step 5.1: Conduct Review Meeting
- [ ] Incident lead presents timeline
- [ ] Technical team explains root cause
- [ ] Discuss detection gaps
- [ ] Identify lessons learned
- [ ] Assign preventive actions

#### Step 5.2: Document Root Cause

```markdown
## Root Cause Analysis - SECURITY-2026-06-001

**What happened:** SQL injection in user search endpoint

**Root cause:** User input not parameterized in query
- Change: Commit abc123 (2026-05-15)
- Reason: Developer unfamiliar with parameterized queries
- Testing gap: No SQL injection tests for this endpoint

**Why it wasn't caught:**
1. Code review: Reviewer missed pattern
2. Testing: No security tests for this function
3. Scanning: Bandit didn't flag this pattern

**What we're doing:**
1. Fix: Implement parameterized queries (DONE)
2. Testing: Add SQL injection tests (IN PROGRESS)
3. Training: SQL injection workshop (SCHEDULED)
4. Review: Add security checks to code review template
```

#### Step 5.3: Implement Preventive Actions

- [ ] Update code review checklist
- [ ] Add/update security tests
- [ ] Update developer documentation
- [ ] Schedule training sessions
- [ ] Update CI/CD security scanning (if needed)
- [ ] Track action items to completion

#### Step 5.4: Update This Playbook

- [ ] Did this playbook help? What was missing?
- [ ] Should procedures be updated?
- [ ] Were contact info/roles correct?
- [ ] Update version number if changes made

---

## Escalation Matrix

### Decision Tree

```
Is this definitely a security incident?
├─ NO → Close ticket, no escalation needed
└─ YES → Assess severity

Severity = CRITICAL (CVSS 9-10)?
├─ YES → IMMEDIATE ESCALATION
│   ├─ Call Security Lead
│   ├─ Activate War Room
│   ├─ Notify CEO/CRO
│   └─ Response time: 1 hour
└─ NO → Continue assessment

Severity = HIGH (CVSS 7-8)?
├─ YES → ESCALATION
│   ├─ Email Security Lead
│   ├─ Schedule call
│   ├─ Notify CRO
│   └─ Response time: 4 hours
└─ NO → Continue assessment

Severity = MEDIUM (CVSS 4-6)?
├─ YES → NOTIFICATION
│   ├─ Create ticket
│   ├─ Notify team
│   └─ Response time: 1 day
└─ NO → LOW severity

Severity = LOW (CVSS 0-3)?
├─ Create ticket
├─ Track for next release
└─ Response time: 1 week
```

### Contact Information

| Situation | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| **Critical Incident** | Security Lead | CTO | CEO |
| **High Severity** | Security Lead | Technical Lead | CTO |
| **Medium Severity** | Technical Lead | Security Lead | - |
| **Low Severity** | Ticket system | Backlog review | - |

---

## Communication Plan

### External Communication Timeline

| When | Who | Channel | Message |
|------|-----|---------|---------|
| **Immediately** | Affected users | Email | "We're aware, investigating" |
| **4 hours** | All users | Email/Status page | Interim update |
| **24 hours** | All users | Email/Blog | Root cause + fix + prevention |
| **48 hours** | Regulators (if needed) | Formal letter | Legal notification |

### Status Page Updates

- Status page: `status.sms-app.io` (if available)
- Update frequency: Every 2 hours during incident
- Message template:
  ```
  [TIME] [SEVERITY] [STATUS]
  We're [INVESTIGATING/MITIGATING/MONITORING] a [BRIEF DESCRIPTION].
  [NEXT UPDATE: TIME]
  ```

---

## Post-Incident Review Template

```markdown
# SECURITY-[DATE]-[ID] - Post-Incident Review

**Date:** [DATE]  
**Incident:** [TITLE]  
**Severity:** [CVSS SCORE]  
**Duration:** [START] to [END] ([X minutes/hours])

## Timeline

| Time | Event |
|------|-------|
| T+0 | Incident detected |
| T+X | [Event] |
| T+Y | [Event] |

## Root Cause

[Detailed explanation of why this happened]

## Impact

- **Systems:** [List]
- **Users:** [Count, %, location]
- **Data:** [Type, count of records, sensitivity]
- **Duration:** [Minutes/hours]

## Remediation

**Immediate:** [What was done to stop it]  
**Short-term:** [What we did to fix it]  
**Long-term:** [What we're doing to prevent it]

## Lessons Learned

| What Went Well | What Didn't | Improvement |
|---|---|---|
| | | |

## Action Items

- [ ] Action 1 (Owner: NAME, Due: DATE)
- [ ] Action 2 (Owner: NAME, Due: DATE)
- [ ] Action 3 (Owner: NAME, Due: DATE)

## Prevention

**Process changes:**
- [Change 1]
- [Change 2]

**Tool/automation additions:**
- [Addition 1]
- [Addition 2]

**Training needs:**
- [Training 1]
- [Training 2]

**Sign-off:**
- Security Lead: _____ Date: _____
- Technical Lead: _____ Date: _____
- Product Lead: _____ Date: _____
```

---

## Quick Reference - During Incident

### Critical Actions Checklist

```
FIRST 15 MINUTES:
[ ] Verify incident is real
[ ] Assess severity (Critical/High/Medium/Low)
[ ] Contact Security Lead
[ ] Create incident ticket: SECURITY-[DATE]-[ID]
[ ] Begin investigation
[ ] Prepare to activate War Room if Critical

FIRST HOUR:
[ ] Complete initial assessment
[ ] Identify root cause
[ ] Determine scope of exposure
[ ] Begin containment steps
[ ] Prepare communication for team

FIRST 4 HOURS (HIGH) / FIRST 24 HOURS (MEDIUM):
[ ] Develop remediation plan
[ ] Implement fix
[ ] Test fix
[ ] Deploy to production
[ ] Verify fix is working
[ ] Notify affected users

WITHIN 72 HOURS:
[ ] Complete post-incident review
[ ] Document root cause analysis
[ ] Assign preventive actions
[ ] Schedule team training if needed
[ ] Update security procedures
```

---

## Legal & Compliance Notes

### When to Notify Authorities

**Data Breach with PII:**
- GDPR (EU): Must notify within 72 hours
- CCPA (California): Must notify without unreasonable delay
- Others: Check applicable laws by jurisdiction

**What to document:**
- When breach discovered
- When breach occurred
- What data was exposed
- Who was notified and when
- What remediation was done

### Evidence Preservation

During investigation, preserve:
- [ ] Log files (do not rotate/delete)
- [ ] Database backups (preserve state at breach time)
- [ ] Git history (do not force-push)
- [ ] Email/chat records (relevant context)
- [ ] Access logs (who accessed what)

**Retain for:** At least 30 days, preferably 90 days

---

## Appendix: Common Scenarios

### Scenario 1: Unpatched CVE in Dependency

```
1. Dependabot alert: Django has CVE-2026-12345 (Critical)
2. Update Django: pip install --upgrade django
3. Test: Run pytest
4. Deploy: Merge PR, deploy to production
5. Verify: Check production runs new version
6. Review: Did this affect any existing exploits? Check logs
7. Communicate: Notify team, post to security channel
```

### Scenario 2: Hardcoded Secret Found in Git

```
1. Developer commits AWS key to git (mistake)
2. Pre-commit hook should have caught this (if configured)
3. If not caught:
   a. Immediately rotate AWS key
   b. Search git history: git log -p | grep -i "AKIA"
   c. Force-push clean history (if no published commits)
   d. Create new commit removing secret
4. Add rule to prevent future hardcoded secrets
5. Audit for similar secrets in codebase
```

### Scenario 3: SQL Injection Discovered

```
1. Code review finds: SELECT * FROM users WHERE email = '{user_input}'
2. Severity: HIGH (CVSS 7.5)
3. Fix: Use parameterized queries
4. Test: Add unit test for SQL injection
5. Deploy: Follow normal merge request process
6. Verify: Check production version
7. Audit: Check for similar patterns in codebase
8. Review: Why did code review/tests miss this?
```

---

**Last Updated:** 2026-06-02  
**Next Review:** 2026-09-02  
**Status:** ACTIVE


