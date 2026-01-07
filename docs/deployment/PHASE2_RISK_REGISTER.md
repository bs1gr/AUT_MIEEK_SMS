# Phase 2 Risk Register (Jan 27 - Mar 7, 2026)

**Document**: Phase 2 Risk Assessment & Mitigation
**Timeline**: January 7, 2026 (before Phase 2 starts Jan 27)
**Owner**: Tech Lead / Risk Manager
**Source**: [PHASE2_CONSOLIDATED_PLAN.md](PHASE2_CONSOLIDATED_PLAN.md)
**Status**: ✅ Ready for review

---

## 📊 Risk Matrix Overview

| Risk ID | Category | Risk | Impact | Probability | Severity | Status |
|---------|----------|------|--------|-------------|----------|--------|
| R1 | Technical | RBAC schema conflicts | Production down | Medium | Critical | 🟡 Monitor |
| R2 | Technical | Permission check regression | Security bypass | Low | Critical | 🔴 High |
| R3 | Technical | N+1 queries in new permission checks | Performance degradation | Medium | High | 🟡 Monitor |
| R4 | Schedule | Phase 2 delay due to bugs | Miss March deadline | Medium | Medium | 🟠 Plan |
| R5 | Resource | Team member absence | Timeline slip | Low | High | 🟡 Monitor |
| R6 | Infrastructure | CI/CD pipeline instability | Blocked deployments | Low | Medium | 🟠 Plan |
| R7 | Quality | Test coverage gaps in RBAC | Untested edge cases | Medium | Medium | 🟠 Plan |
| R8 | Security | Permission bypass vulnerability | Security breach | Low | Critical | 🔴 High |
| R9 | Data | Migration data loss | Data inconsistency | Low | Critical | 🔴 High |
| R10 | External | GitHub/Docker service outage | Deployment blocked | Low | Medium | 🟠 Plan |

---

## 🔴 CRITICAL RISKS (Severity = Critical)

### R2: Permission Check Regression / Security Bypass

**Description**:
New permission decorator in Week 1 could have logic errors that allow unauthorized access. Either:
- False negatives: Decorator doesn't block access when it should
- False positives: Decorator blocks access when it shouldn't
- Edge cases: Multi-role users, cascading permissions not checked correctly

**Current Impact**: Could expose production data to unauthorized users

**Probability**: LOW (15%) - Design reviewed, but complex logic

**Severity**: CRITICAL - Security vulnerability

### Mitigation Strategy:

**Prevention (Week 1)**:
1. ✅ Security-focused code review (mandatory 2-person review)
   - Reviewer 1: Backend senior dev
   - Reviewer 2: Security-conscious developer
   - Focus: All conditional logic in `@require_permission` decorator

2. ✅ Permission test suite (40+ test cases)
   - Unit tests: All decorator branches
   - Integration tests: Real endpoints with different roles
   - Edge cases: Multi-role users, permission inheritance
   - Target: 95% code coverage on `rbac.py`

3. ✅ Security checklist
   - [ ] Decorator defaults to DENY (safe fail)
   - [ ] No permission bypass via URL parameter manipulation
   - [ ] Cascade logic tested with 3+ role levels
   - [ ] Error messages don't reveal permission structure
   - [ ] Audit logging for permission checks

**Detection (Week 2-6)**:
1. Automated security test suite in CI
   - Tests that verify permission checks work on all 30+ endpoints
   - Fails build if any endpoint accessible without permission
   - Runs on every merge to main

2. Manual security review (Week 5)
   - Penetration test: Try 10+ common bypass techniques
   - Test with different user roles (admin, teacher, student)
   - Verify error messages don't leak information

**Response** (If detected):
1. **Critical**: Stop deployment, patch, re-test
2. **Non-critical**: Create issue, fix in maintenance release
3. **Document**: Post-incident review within 24 hours

**Owner**: Security-focused backend dev + Tech lead

---

### R8: Permission Bypass Vulnerability / Data Exposure

**Description**:
Similar to R2, but more specific: An attacker could gain access to data they shouldn't by:
- Calling endpoint directly (not through UI)
- Modifying request (headers, params) to appear as different user
- Using race condition between permission check and data access
- Exploiting API endpoint that was overlooked in refactoring

**Current Impact**: Direct exposure of student data, grades, attendance records

**Probability**: LOW (10%) - But very serious

**Severity**: CRITICAL - Data breach risk

### Mitigation Strategy:

**Prevention (Week 1-2)**:
1. ✅ Complete endpoint audit
   - List all 30+ admin endpoints (Week 2.1)
   - Verify each has permission check
   - No endpoint should be "accidentally unprotected"

2. ✅ Atomic permission checking
   - Permission check and data access in same transaction
   - No window for race conditions
   - Database-level constraints where possible

3. ✅ API documentation with permission matrix
   - Every endpoint documents required permission
   - Missing permission → build failure
   - Automated check in CI

**Detection (Week 5-6)**:
1. Final security review
   - External security auditor (if budget allows)
   - Or intensive internal review by 2+ people
   - Try to find 5+ bypass techniques

2. Automated tests
   - 20+ test cases for permission bypass attempts
   - Part of test suite, run on every PR

**Response** (If detected):
1. Stop all deployments
2. Patch vulnerability
3. Audit logs for any abuse
4. Notify stakeholders if data exposed
5. Post-incident report

**Owner**: Tech lead + one senior backend dev (dedicated)

---

### R9: Migration Data Loss / Inconsistency

**Description**:
When applying RBAC to existing users, could have data issues:
- Users lose all permissions during migration
- Inconsistent state (missing RolePermission records)
- Duplicate permission assignments
- Version mismatch (old DB schema + new code)

**Current Impact**: Users locked out, need manual password reset

**Probability**: LOW (5%) - But impacts all users

**Severity**: CRITICAL - Service unavailability

### Mitigation Strategy:

**Prevention (Week 1)**:
1. ✅ Safe migration design
   - Migration script idempotent (can run multiple times)
   - Backup before running
   - Atomic transactions (all-or-nothing)
   - Rollback capability

2. ✅ Migration testing
   - Test on realistic data (50k students, 100 courses)
   - Test rollback (upgrade, then downgrade)
   - Verify data integrity after migration
   - Performance test (should complete <5 min)

3. ✅ Default safe state
   - If permission not assigned, user gets read-only access
   - No delete/edit without explicit permission
   - Default role for existing users (e.g., "teacher")

**Detection (Ongoing)**:
1. Pre-deployment check
   - Data validation before going live (Week 6.3)
   - Spot-check 10+ random users have correct permissions
   - Verify no users in "broken" state

2. Monitoring post-deployment
   - Alert if permission-related errors spike (>10 in 1 hour)
   - Monitor for login failures
   - Track "Permission Denied" API responses

**Response** (If detected):
1. Immediately restore from backup (2 min)
2. Investigate migration script for bugs
3. Fix issue, re-test on staging, redeploy
4. Post-mortem: What went wrong?

**Owner**: Database migration expert + DBA

---

## 🟠 HIGH PRIORITY RISKS (Severity = High)

### R3: N+1 Queries in Permission Checks

**Description**:
New permission checking logic could cause database performance degradation:
- If we check `user.roles` then `role.permissions` for each endpoint call
- Could query database 100+ times per request (N+1 problem)
- Response times: 100ms → 5000ms
- Under load: Database connection pool exhausted, requests fail

**Current Impact**: Slow API, poor user experience, potential service failure under load

**Probability**: MEDIUM (40%) - Easy to miss in code review

**Severity**: HIGH - Performance critical

### Mitigation Strategy:

**Prevention (Week 1-2)**:
1. ✅ Query design review
   - Use eager loading: `selectinload()` for `user.roles` and `role.permissions`
   - Load all permissions once, cache in request
   - No lazy loading in permission checks

2. ✅ Performance tests
   - Load test: 100 concurrent requests
   - Each request checks 3+ permissions
   - Should complete <200ms average (not >1s)
   - Baseline: Compare to current endpoints

3. ✅ Query logging in staging
   - Log all database queries
   - Flag queries >100ms
   - Review for N+1 patterns

**Detection (Week 5-6)**:
1. Load testing in CI/CD
   - Automated load tests run weekly
   - Alert if average latency increases >20%
   - Part of release checklist

2. Production monitoring
   - Track database connection usage
   - Monitor slow query log
   - Alert on spike in query count

**Response** (If detected):
1. Add query profiling
2. Optimize with eager loading
3. Add caching if needed
4. Re-test before redeploy

**Owner**: Backend performance specialist

---

### R5: Team Member Absence

**Description**:
If one of the 2-3 backend developers is unavailable during critical weeks:
- Week 1: RBAC foundation (1-2 devs needed)
- Week 2: Endpoint refactoring (2 devs needed for speed)
- Week 5-6: Testing and bug fixes (all hands needed)

**Current Impact**: Timeline slip by 1-2 weeks

**Probability**: LOW (20%) - Vacation, illness, emergency

**Severity**: HIGH - Schedule impact

### Mitigation Strategy:

**Prevention**:
1. ✅ Vacation scheduling
   - No vacation during Jan 27 - Mar 7
   - Confirm availability now (Jan 7)
   - Have backup person identified

2. ✅ Knowledge sharing
   - Document design decisions as we go
   - Code reviews ensure knowledge distribution
   - Pair programming on critical sections

3. ✅ On-call backup
   - Another dev can step in if needed
   - Less familiar, but can continue work
   - Not ideal, but prevents total blockage

**Detection**:
- Weekly standup to confirm availability
- If someone will be out: Redistribute work immediately

**Response**:
1. Trigger backup plan (reassign tasks)
2. Adjust timeline (push deadline back)
3. Reduce scope if needed (defer nice-to-haves)

**Owner**: Project Manager / Tech Lead

---

## 🟡 MEDIUM PRIORITY RISKS (Severity = Medium)

### R1: RBAC Schema Conflicts

**Description**:
New Permission and RolePermission tables could conflict with existing schema:
- Column name exists in another table (collision)
- Foreign key constraint conflicts
- Alembic migration fails
- Downgrade breaks something else

**Current Impact**: Failed migration, database locked, deployment blocked

**Probability**: MEDIUM (35%) - Complex schema

**Severity**: MEDIUM - Recoverable with rollback

### Mitigation Strategy:

**Prevention (Week 1)**:
1. ✅ Schema design review
   - Check for column name collisions (before creating tables)
   - Plan foreign keys carefully
   - Verify index naming (no duplicates)

2. ✅ Migration testing
   - Test on fresh database
   - Test upgrade and downgrade
   - Verify data integrity after migration
   - Run on database with 50k+ records (stress test)

3. ✅ Backup before migration
   - Always backup production database first
   - Have rollback script ready
   - Document rollback procedure

**Detection (Week 2 deployment)**:
- Migration runs in CI/CD (catches errors)
- Staging deployment (catches runtime issues)
- Pre-production dry run

**Response**:
1. Rollback to previous version
2. Fix schema, test again
3. Deploy again when ready
4. Document lesson learned

**Owner**: Database migration expert

---

### R4: Phase 2 Schedule Delay / Miss March Deadline

**Description**:
Timeline could slip due to:
- Unexpected complexity (RBAC harder than estimated)
- Bug fixes taking longer than planned
- Testing takes longer (flaky tests, environment issues)
- Team goes slower than estimated velocity

**Current Impact**: $11.15.1 ships after March 7 (reputational impact)

**Probability**: MEDIUM (45%) - 6 weeks is aggressive

**Severity**: MEDIUM - Business/reputation impact

### Mitigation Strategy:

**Prevention**:
1. ✅ Realistic estimation
   - 40-hour weeks per person
   - Built-in buffer for unknowns (20%)
   - Prioritize must-haves vs nice-to-haves

2. ✅ Scope management
   - Clearly define "done" for each feature
   - Front-load critical features (Weeks 1-3)
   - Defer nice-to-haves if needed

3. ✅ Progress tracking
   - Weekly status updates
   - Burndown chart (estimated vs actual hours)
   - Early warning if trending to miss deadline

**Detection** (Weekly):
- Compare actual vs planned velocity
- If trending -20%: Adjust scope
- If trending -40%: Cut features or extend timeline

**Response**:
1. Reduce scope (cut nice-to-haves)
2. Add resources (bring in another dev)
3. Extend timeline (negotiate deadline)

**Owner**: Project Manager / Tech Lead

---

### R7: Test Coverage Gaps in RBAC

**Description**:
New RBAC code has untested edge cases:
- Multi-role users not tested
- Permission inheritance not tested
- Error conditions not covered
- Real-world permission combinations missing

**Current Impact**: Bugs slip through to production

**Probability**: MEDIUM (40%) - Complex logic, easy to miss edges

**Severity**: MEDIUM - Bugs in production

### Mitigation Strategy:

**Prevention (Week 1)**:
1. ✅ Test plan creation
   - List all permission scenarios (30+)
   - Include edge cases (multi-role, inheritance)
   - Document test cases before coding

2. ✅ Target 95% coverage
   - Measure code coverage (pytest --cov)
   - Fail build if <95% on rbac.py
   - Cover all branches, not just lines

3. ✅ Exploratory testing (Week 5)
   - Manual testing of complex scenarios
   - Try real permission combinations
   - Think like attacker (permission bypass attempts)

**Detection**:
- Coverage reports in CI/CD
- Code review checklist includes test review
- Test coverage diff for every PR

**Response**:
- Identify missing test cases
- Write tests before fixing code
- Add to regression test suite

**Owner**: QA + backend developer

---

## 🟢 MEDIUM PRIORITY RISKS (Low Severity)

### R6: CI/CD Pipeline Instability

**Description**:
GitHub Actions or Docker could have issues:
- GitHub API downtime
- Docker registry timeout
- Flaky network connectivity
- Build failures on infrastructure, not code

**Current Impact**: Can't deploy, but code is fine (temporary blocker)

**Probability**: LOW (25%) - But happens periodically

**Severity**: MEDIUM - Temporary blocker, not critical

### Mitigation Strategy:

**Prevention**:
1. ✅ Pipeline monitoring
   - Check GitHub Actions status page regularly
   - Monitor CI build times (detect slowdowns)
   - Alert on pipeline failures

2. ✅ Fallback procedures
   - Document how to deploy manually if CI fails
   - Have backup Docker build method
   - Scripts to re-run failed steps

**Detection**:
- CI/CD builds logged and tracked
- Automatic retries in some workflows
- Slack alerts on pipeline failures

**Response**:
1. Check GitHub status page
2. Retry failed jobs
3. If still failing, use manual deployment
4. File issue with GitHub/Docker if infrastructure problem

**Owner**: DevOps / Infrastructure

---

### R10: External Service Outage (GitHub/Docker)

**Description**:
Third-party services go down:
- GitHub.com API unavailable (pull requests, releases)
- Docker registry timeout (can't pull images)
- npm registry down (can't install packages)

**Current Impact**: Deployment delayed, but not production issue

**Probability**: LOW (10%) - Rare

**Severity**: MEDIUM - Temporary blocker

### Mitigation Strategy:

**Prevention**:
1. ✅ Dependency caching
   - Cache Docker images locally
   - Cache npm packages (already in .github/workflows)
   - Pre-build before release window

2. ✅ Status monitoring
   - Subscribe to GitHub/Docker status pages
   - Check status before starting deployment
   - Have backup deployment time

**Detection**:
- Automated service health checks
- Manual verification before critical operations

**Response**:
1. Check service status page
2. Wait for service to recover (usually <1 hour)
3. Retry deployment
4. If critical: Use cached versions and retry later

**Owner**: DevOps / Infrastructure

---

## 📈 Risk Trend & Timeline

### Week 1 (Jan 27-31): RBAC Foundation
- ⚠️ **HIGH RISK**: R2, R8 (security bugs in new code)
- ⚠️ **MEDIUM RISK**: R1 (schema design), R3 (N+1 queries)
- **Action**: Heavy code review, security focus, performance testing

### Week 2 (Feb 3-7): Endpoint Refactoring
- ⚠️ **HIGH RISK**: R2, R8 (security, endpoint coverage)
- ⚠️ **MEDIUM RISK**: R4 (schedule - busy week)
- **Action**: Security checklist for every endpoint, integration tests

### Week 3 (Feb 10-14): Permission Management API
- 🟢 **MEDIUM RISK**: R7 (test coverage)
- 🟢 **MEDIUM RISK**: R4 (schedule tracking)
- **Action**: Test plan, coverage reports, weekly standup

### Week 4 (Feb 17-21): CI/CD Integration
- 🟢 **LOW RISK**: R6, R10 (infrastructure)
- 🟢 **MEDIUM RISK**: R7 (CI test coverage)
- **Action**: Baseline metrics, monitoring setup

### Week 5 (Feb 24-28): Documentation & Testing
- 🟢 **LOW RISK**: R3, R4 (mostly safe)
- ⚠️ **MEDIUM RISK**: R7 (final test push)
- **Action**: Comprehensive test suite, all edge cases

### Week 6 (Mar 3-7): Final Testing & Release
- ⚠️ **MEDIUM RISK**: R4 (if running late), R9 (data migration)
- **Action**: Final security review, migration test, staging validation

---

## 🛡️ Risk Monitoring Dashboard

### Weekly Monitoring Checklist

**Every Monday Standup** (15 minutes):
```
R1: Schema conflicts
   Status: ✅ ON TRACK / ⚠️ ATTENTION / 🔴 CRITICAL
   Notes: ______________________________

R2: Permission bypass vulnerability
   Status: ✅ ON TRACK / ⚠️ ATTENTION / 🔴 CRITICAL
   Notes: ______________________________

R3: N+1 queries
   Status: ✅ ON TRACK / ⚠️ ATTENTION / 🔴 CRITICAL
   Notes: ______________________________

R4: Schedule delay
   Status: ✅ ON TRACK / ⚠️ ATTENTION / 🔴 CRITICAL
   Notes: ______________________________
   Actual vs Planned: ___%

R5: Team absence
   Status: ✅ ALL PRESENT / ⚠️ ONE OUT / 🔴 CRITICAL
   Notes: ______________________________

R7: Test coverage
   Status: ✅ ON TRACK / ⚠️ BELOW TARGET / 🔴 CRITICAL
   Notes: Coverage: ___%
```

---

## 📋 Risk Control Owner Assignments

| Risk ID | Primary Owner | Secondary Owner | Review Cadence |
|---------|---------------|-----------------|-----------------|
| R1 | Database Expert | Tech Lead | Weekly |
| R2 | Security Dev | Tech Lead | 2x per week |
| R3 | Performance Dev | Backend Lead | Weekly |
| R4 | Project Manager | Tech Lead | Weekly |
| R5 | Project Manager | HR/Management | Ad-hoc |
| R6 | DevOps | Backend Lead | Weekly |
| R7 | QA Lead | Backend Lead | Weekly |
| R8 | Tech Lead | Security Dev | 2x per week |
| R9 | Database Expert | DevOps | Pre-deployment |
| R10 | DevOps | Tech Lead | Ad-hoc |

---

## ✅ Sign-Off Checklist

**Before Phase 2 Kicks Off** (Jan 27):

```
☐ All risks identified and assessed
☐ Mitigation strategies approved by tech lead
☐ Monitoring procedures documented
☐ Owners assigned and notified
☐ Budget approved for external security audit (if R8 critical)
☐ Backup and rollback procedures ready
☐ Team trained on risk response procedures
☐ Stakeholders aware of critical risks

Signed Off By: _________________ (Tech Lead)
Date: _________________
Status: ✅ APPROVED
```

---

**Document Status**: ✅ Complete and ready for review
**Created**: January 7, 2026
**Review Cycle**: Weekly during Phase 2
**Next Review**: January 20, 2026 (Phase 2 prep final check)
