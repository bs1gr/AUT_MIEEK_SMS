# Phase 2 Team Onboarding Package (Jan 27, 2026)

**Timeline**: January 27, 2026 (Kickoff Day)
**Duration**: 30 minutes per role (total: 2 hours for full team)
**Owner**: Tech Lead
**Audience**: All Phase 2 team members

---

## 🎯 Onboarding Overview

This package provides role-specific setup and orientation for Phase 2 (RBAC + CI/CD) execution.

**What You'll Get**:
1. Role-specific responsibilities and deliverables
2. Setup instructions for your development environment
3. How to use swimlanes and dependencies document
4. Daily standup template and communication channels
5. Success metrics for your role
6. Quick reference guide

---

## 👥 Role-Specific Onboarding

### **BACKEND DEVELOPERS (2-3 people) - 30 min setup**

#### Your Role
- Implement RBAC permission system (15+ permissions)
- Refactor 30+ API endpoints to enforce permissions
- Create permission management API (5 endpoints)
- Ensure 95% test coverage
- **Total Effort**: 120-150 hours across 6 weeks

#### Week 1 Assignment
**Developer 1**: RBAC Foundation (20 hours)
- Permission matrix design (4h)
- Database schema design (6h)
- Backend models implementation (6h)
- Design review preparation (4h)

**Developer 2**: Permission Utilities (12 hours)
- Permission check decorator (6h)
- Helper utilities (3h)
- Unit tests (3h)

**Developer 3 (Optional)**: Code Review (4 hours)
- Architecture review (2h)
- Risk assessment (2h)

#### Environment Setup Checklist
- [ ] Clone repository: `git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git`
- [ ] Create feature branch: `git checkout -b feature/phase2-rbac`
- [ ] Install Python 3.11+: Verify with `python --version`
- [ ] Install dependencies: `cd backend && pip install -r requirements-dev.txt`
- [ ] Configure IDE:
  - [ ] Set Python interpreter to venv
  - [ ] Enable type checking (mypy)
  - [ ] Set code formatter (ruff)
  - [ ] Enable linting (ruff)
- [ ] Verify database: `python -m pytest tests/test_soft_delete_filtering.py -v`
- [ ] Verify imports: `python -c "import backend.models; print('✅ Imports working')"`
- [ ] Run existing tests: `pytest -q` (should see 370+ passing)

#### Key Files to Review
1. **Architecture Reference**: `docs/development/ARCHITECTURE.md`
2. **RBAC Design**: `docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md` (Week 1 section)
3. **Models Template**: `backend/models.py` (study existing patterns)
4. **Test Examples**: `backend/tests/test_soft_delete_filtering.py` (40+ test example)
5. **API Pattern**: `backend/routers/routers_students.py` (endpoint structure)

#### Daily Standup Template (5 min)
```
📝 YESTERDAY: [What I completed]
  ✅ Task 1.1: Permission matrix 80% complete
  ✅ Meetings/reviews attended

🎯 TODAY: [What I'm doing]
  🔄 Task 1.1: Finalize permission matrix design
  🔄 Task 1.2: Start database schema design

⚠️ BLOCKERS: [What's stopping me]
  None currently

📊 HOURS: Yesterday: 8h, Today planned: 8h
```

#### Success Metrics for Week 1
- ✅ Permission matrix approved by tech lead
- ✅ Database migration tested (up and down)
- ✅ Models with relationships working
- ✅ Decorator functional with 10+ unit tests
- ✅ 95% test coverage in `test_rbac.py`
- ✅ Code review passed (no major issues)

#### Code Review Checklist Before Committing
```
Before pushing to GitHub:
☐ Run: pytest -q (all tests passing)
☐ Run: ruff check . && ruff format .
☐ Run: mypy backend/ (type checking clean)
☐ Check: git diff (review your changes)
☐ Commit message: Descriptive and links issue
  Format: "feat(rbac): Implement permission matrix (fixes #116)"
☐ Push: git push origin feature/phase2-rbac
☐ Create PR with detailed description
```

#### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "ModuleNotFoundError: No module named 'backend'" | Run from repository root, use `python -m pytest` |
| "PYTHONPATH not set" | Set in IDE or run: `$env:PYTHONPATH = "$(Get-Location)"` |
| "Test database locked" | Restart pytest, delete `db/test*.db` |
| "Migration conflict" | Pull latest, merge if needed, restart |
| "Decorator not found" | Verify `from backend.rbac import require_permission` |

#### Chat/Communication Channel
- **Standup**: Daily 10:00 AM (15 min)
- **Sync**: Friday 3:00 PM (30 min, sprint review)
- **Slack**: #phase2-backend
- **Escalations**: Tag @tech-lead or @pm

---

### **FRONTEND DEVELOPER (1 person) - 30 min setup**

#### Your Role
- Design and implement Permission UI components (3+ components)
- Integrate admin panel for permission management
- Add EN + EL translations
- Create component tests
- **Total Effort**: 40 hours across 6 weeks

#### Week 1 Assignment (Parallel - 2 hours)
- Design review attendance (1h)
- Permission structure learning (1h)
- Component architecture planning

#### Environment Setup Checklist
- [ ] Clone repository: `git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git`
- [ ] Create feature branch: `git checkout -b feature/phase2-ui`
- [ ] Install Node 20+: Verify with `node --version`
- [ ] Install dependencies: `cd frontend && npm install`
- [ ] Verify project setup: `npm run dev` (should start Vite at localhost:5173)
- [ ] Configure IDE:
  - [ ] Enable React/TSX syntax highlighting
  - [ ] Enable ESLint
  - [ ] Set up Prettier formatter
  - [ ] Install i18next extension
- [ ] Run tests: `npm run test -- --run` (should pass)
- [ ] Verify translations: Check `frontend/src/locales/en/` and `frontend/src/locales/el/`

#### Key Files to Review
1. **Architecture Reference**: `docs/development/ARCHITECTURE.md` (Frontend section)
2. **Component Examples**: `frontend/src/features/students/StudentsList.tsx`
3. **Translation Pattern**: `frontend/src/translations.ts` + `frontend/src/locales/`
4. **API Client**: `frontend/src/api/api.js` (axios setup)
5. **Component Tests**: `frontend/src/features/**/__tests__/*.test.tsx`

#### Week 3 Assignment (Main Build - 15 hours)
- PermissionMatrix component (5h)
- RolePermissions component (5h)
- PermissionSelector component (3h)
- Admin panel integration (2h)

#### UI/UX Checklist
```
Permission Matrix Component:
☐ Display all 15+ permissions in table
☐ Show permission name, description, assigned role
☐ Bulk assign/remove buttons
☐ Search/filter functionality
☐ Responsive design (mobile, tablet, desktop)

Role Permissions Component:
☐ Select role from dropdown
☐ Show assigned permissions (checked)
☐ Show available permissions (unchecked)
☐ Drag-drop to reorder (optional)
☐ Save/cancel buttons

i18n Translation:
☐ All UI text in English (en/permissions.ts)
☐ All UI text in Greek (el/permissions.ts)
☐ Use consistent key naming (e.g., 'permission.name', 'permission.assign')
```

#### Translation Key Pattern
```typescript
// EN: frontend/src/locales/en/permissions.ts
export const permissions = {
  title: "Permission Management",
  matrix: {
    name: "Permission Name",
    description: "Description",
    assigned: "Assigned To"
  },
  actions: {
    assign: "Assign Permission",
    remove: "Remove Permission"
  }
}

// EL: frontend/src/locales/el/permissions.ts
export const permissions = {
  title: "Διαχείριση Δικαιωμάτων",
  matrix: {
    name: "Όνομα Δικαιώματος",
    description: "Περιγραφή",
    assigned: "Ανατεθειμένα σε"
  }
  // ... etc
}
```

#### Daily Standup Template (5 min)
```
📝 YESTERDAY: [What I completed]
  ✅ Designed PermissionMatrix component structure
  ✅ Created component file with TypeScript types

🎯 TODAY: [What I'm doing]
  🔄 Implement PermissionMatrix rendering logic
  🔄 Add i18n translations (EN)

⚠️ BLOCKERS: [What's stopping me]
  ⏳ Waiting for backend API endpoint (Task 3.1 in progress)

📊 HOURS: Yesterday: 6h, Today planned: 8h
```

#### Success Metrics for Week 3
- ✅ 3 components created (PermissionMatrix, RolePermissions, PermissionSelector)
- ✅ Components functional (can render permission data)
- ✅ Admin panel integrated (/admin/permissions route)
- ✅ EN translations complete (permissions.ts)
- ✅ EL translations complete (permissions.ts)
- ✅ Component tests written (30+ tests)
- ✅ Code review passed

#### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "npm install fails" | Clear cache: `npm cache clean --force && npm install` |
| "Port 5173 in use" | Kill process: `Get-Process node \| Stop-Process` |
| "i18next key missing" | Add key to both en/permissions.ts and el/permissions.ts |
| "Component not rendering" | Check import path, verify types match API response |
| "Tailwind styles not applied" | Rebuild: `npm run dev`, clear browser cache |

#### Chat/Communication Channel
- **Standup**: Daily 10:00 AM (15 min)
- **Design Sync**: Wednesday 2:00 PM (30 min, with design review)
- **Slack**: #phase2-frontend
- **API Status**: Check #phase2-backend for API readiness

---

### **QA ENGINEER (1 person) - 30 min setup**

#### Your Role
- Plan and execute testing for RBAC features
- Create and maintain E2E tests (expand to 30+)
- Set up load testing in CI/CD
- Ensure 95%+ test pass rate
- **Total Effort**: 50-60 hours across 6 weeks

#### Week 1 Assignment (Parallel - 2 hours)
- Test planning and strategy (1h)
- Test infrastructure review (1h)

#### Environment Setup Checklist
- [ ] Clone repository: `git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git`
- [ ] Create feature branch: `git checkout -b feature/phase2-testing`
- [ ] Install dependencies: `cd frontend && npm install`
- [ ] Install Playwright: `npx playwright install`
- [ ] Configure test runner: `npm run test -- --run` (should pass)
- [ ] Verify E2E setup: `npx playwright test --headed` (UI mode)
- [ ] Check load testing tools: `pip install locust` or similar
- [ ] Set up test reporting: Verify artifact uploads work

#### Key Files to Review
1. **Testing Guide**: `docs/operations/E2E_TESTING_GUIDE.md`
2. **E2E Test Examples**: `frontend/tests/e2e/students.spec.ts`
3. **Load Testing**: `load-testing/README.md`
4. **Metrics Scripts**: `scripts/e2e_metrics_collector.py`
5. **CI/CD Pipeline**: `.github/workflows/ci-cd-pipeline.yml`

#### Test Plan for Phase 2

```
Week 1-2: Preparation & Infrastructure
☐ Review all code being committed
☐ Identify test cases needed
☐ Set up test data fixtures
☐ Configure CI metrics collection

Week 3: Manual Testing & E2E Creation
☐ Manual smoke tests (8 test cases)
☐ Create 5+ permission-based E2E tests
☐ Test happy path: assign permission → verify access
☐ Test sad path: remove permission → verify denied

Week 4: Load Testing Setup
☐ Configure load testing scenarios
☐ Run baseline tests
☐ Establish performance targets
☐ Integrate into CI/CD

Week 5: Expansion & Coverage
☐ Expand E2E tests to 30+ total (6 permission tests)
☐ Create negative test cases (permission denied)
☐ Create cascading permission tests
☐ Refine load testing scenarios

Week 6: Final Validation
☐ Run full E2E suite
☐ Run load tests
☐ Verify metrics collection
☐ Document any issues
```

#### Test Case Template
```typescript
// frontend/tests/e2e/permissions.spec.ts
import { test, expect } from '@playwright/test';

test('should deny access when permission removed', async ({ page }) => {
  // 1. Login as admin
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("Login")');

  // 2. Assign permission to test user
  await page.goto('/admin/permissions');
  await page.click('text=Test User');
  await page.check('input[value="students:edit"]');
  await page.click('button:has-text("Save")');

  // 3. Verify user has access
  // (login as test user, verify can edit)

  // 4. Remove permission
  await page.goto('/admin/permissions');
  await page.click('text=Test User');
  await page.uncheck('input[value="students:edit"]');
  await page.click('button:has-text("Save")');

  // 5. Verify user denied access (403)
  // (login as test user, verify cannot edit, see error)

  expect(response.status()).toBe(403);
});
```

#### Daily Standup Template (5 min)
```
📝 YESTERDAY: [What I completed]
  ✅ Reviewed backend endpoint changes
  ✅ Created 2 new E2E test cases

🎯 TODAY: [What I'm doing]
  🔄 Execute manual smoke tests (8 tests)
  🔄 Review test metrics collection

⚠️ BLOCKERS: [What's stopping me]
  None, proceeding as planned

📊 HOURS: Yesterday: 7h, Today planned: 8h
```

#### Success Metrics for Phase 2
- ✅ E2E: 30+ tests, 95%+ passing
- ✅ Integration: 50+ permission scenarios tested
- ✅ Load: All baselines met (p95 <200ms)
- ✅ Coverage: 95%+ backend, 90%+ frontend
- ✅ Flakiness: 0% (no flaky tests)
- ✅ Metrics: Collected and trended

#### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "E2E test timeout" | Increase timeout to 60s, check if server responsive |
| "Selector not found" | Use `--headed` mode to debug, verify DOM structure |
| "Load test fails" | Check test data exists, verify API endpoints responding |
| "Metrics not collected" | Verify e2e_metrics_collector.py running post-test |
| "Flaky test" | Add waits, verify element visibility, retry logic |

#### Chat/Communication Channel
- **Standup**: Daily 10:00 AM (15 min)
- **Quality Sync**: Thursday 2:00 PM (30 min, metrics review)
- **Slack**: #phase2-qa
- **Test Results**: Posted in Slack #test-results daily

---

### **DEVOPS / TECH LEAD (1 person) - 30 min setup**

#### Your Role
- Oversee architecture and design decisions
- Set up CI/CD infrastructure (metrics, load testing)
- Manage performance monitoring
- Ensure no regressions in Phase 1
- Approve each week's gate
- **Total Effort**: 30-40 hours across 6 weeks

#### Week 1 Assignment (Parallel - 6 hours)
- Architecture review (2h)
- Risk assessment (2h)
- Gate approval (2h)

#### Environment Setup Checklist
- [ ] GitHub Actions access verified
- [ ] Docker Hub credentials configured
- [ ] GitHub repository settings reviewed
- [ ] Branch protection rules verified (require review, status checks)
- [ ] Deployment scripts (DOCKER.ps1, NATIVE.ps1) tested
- [ ] Monitoring tools accessible (if using Grafana, Prometheus)
- [ ] Slack integration configured for alerts
- [ ] Alert recipients configured (PagerDuty, etc. if applicable)

#### Key Files to Review
1. **CI/CD Pipeline**: `.github/workflows/ci-cd-pipeline.yml`
2. **Swimlanes & Dependencies**: `docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md`
3. **Risk Assessment**: See "Risk Mitigation" section
4. **Monitoring Scripts**: `scripts/e2e_metrics_collector.py`, `scripts/e2e_failure_detector.py`
5. **Deployment Guide**: `docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.15.1.md`

#### Weekly Gate Checklist

```
Week 1 Gate (Jan 31) - RBAC Foundation Complete
☐ Permission matrix approved by stakeholders
☐ Database migration tested (up/down)
☐ Models with relationships working
☐ Decorator functional + tested (95% coverage)
☐ All code reviewed (no major issues)
☐ No regressions in Phase 1 tests
Decision: ✅ GO / ❌ NO-GO

Week 2 Gate (Feb 7) - Endpoints Refactored
☐ 30+ endpoints refactored
☐ Integration tests passing (95% coverage)
☐ Zero regressions in Phase 1 features
☐ Migration guide tested
☐ All code reviewed
Decision: ✅ GO / ❌ NO-GO

... (similar for weeks 3-6)
```

#### Performance Monitoring Setup

```
1. Configure metrics collection:
   - E2E test metrics: e2e_metrics_collector.py
   - Failure detection: e2e_failure_detector.py
   - Performance baselines: load-testing suite

2. Create dashboard:
   - E2E pass rate (target: ≥95%)
   - Load test p95 latency (target: <200ms)
   - API coverage (target: ≥95%)

3. Set alert thresholds:
   - E2E critical pass rate <95% → ALERT
   - Load test p95 >200ms → WARNING
   - Code coverage drops >5% → WARNING
```

#### Daily Standup Template (5 min)
```
📝 YESTERDAY: [What I completed]
  ✅ Reviewed architecture design from backend team
  ✅ Verified CI/CD pipeline working

🎯 TODAY: [What I'm doing]
  🔄 Review GitHub Actions metrics collector
  🔄 Set up performance dashboard

⚠️ BLOCKERS: [What's stopping me]
  None, proceeding as planned

📊 HOURS: Yesterday: 6h, Today planned: 6h
```

#### Gate Approval Process (End of Each Week)

**Step 1: Gather Data** (Fri 3 PM)
- Backend lead reports: Tasks complete %, test coverage
- Frontend lead reports: Components built, tests passing
- QA reports: Test pass rate, metrics

**Step 2: Review Blockers** (Fri 3:30 PM)
- Any blocking issues identified?
- Any regressions detected?
- Any performance concerns?

**Step 3: Make Decision** (Fri 4 PM)
- ✅ GO: All criteria met, proceed to next week
- ❌ NO-GO: Address issues, reschedule gate for next Mon
- ⚠️ GO WITH CONDITIONS: Proceed but address by mid-week

**Step 4: Document Decision** (Fri 4:15 PM)
- Update DEPLOYMENT_STATUS_TRACKER.md
- Notify team in Slack
- Schedule next gate

#### Common Issues & Escalations

| Issue | Escalation | Action |
|-------|-----------|--------|
| Code review bottleneck | Limit PRs to 3 open | Add second reviewer |
| Test flakiness increasing | Mark as blocker | Team debugging session |
| Performance regression | Escalate to team | Optimize queries/code |
| Blocked on dependency | Escalate to PM | Adjust timeline |

#### Chat/Communication Channel
- **Standup**: Daily 10:00 AM (15 min, full team)
- **Gate Review**: Friday 3:00 PM (1 hour, all leads)
- **Escalations**: #alerts channel
- **Tech Decisions**: #tech-decisions Slack

---

## 📞 Team Communication

### Daily Standup (10:00 AM, 15 minutes)
**Who**: All team members
**Format**: Quick status update per person
**Platform**: Slack or Video call
**Template**: Use role-specific standup template above

**Agenda**:
1. Completed yesterday (2-3 min per person)
2. Planned today (2-3 min per person)
3. Blockers (1 min per person)
4. Tech lead: Any urgent decisions?

### Weekly Sprint Review (Friday 3:00 PM, 1 hour)
**Who**: Tech lead + all team leads (backend, frontend, QA, DevOps)
**Format**: Demo of completed work
**Platform**: Video call with screen sharing

**Agenda**:
1. Backend: Demo RBAC features (10 min)
2. Frontend: Demo UI components (10 min)
3. QA: Test metrics and results (10 min)
4. DevOps: Infrastructure and performance (10 min)
5. Gate decision and next week planning (10 min)

### Weekly Sync with PM (Friday 4:00 PM, 30 minutes)
**Who**: Tech lead + PM
**Format**: Status and risk discussion
**Platform**: Video call

**Agenda**:
1. Week progress vs. plan
2. Blockers and mitigation
3. Schedule adjustments if needed
4. Stakeholder updates

---

## 📊 Success Metrics Dashboard

**Track These Weekly**:

| Metric | Target | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 |
|--------|--------|--------|--------|--------|--------|--------|--------|
| **Backend** | | | | | | | |
| Tasks complete | 100% | 85% | 95% | 100% | - | - | - |
| Test coverage | ≥95% | 90% | 95% | 98% | - | - | - |
| Code review issues | 0 major | 0 | 0 | 0 | - | - | - |
| **Frontend** | | | | | | | |
| Components built | 3 | 0 | 0 | 3 | 3 | 3 | 3 |
| Component tests | 30 | 0 | 0 | 20 | 30 | 30 | 30 |
| **QA** | | | | | | | |
| E2E pass rate | ≥95% | 85% | 90% | 95% | 95% | 97% | 98% |
| Test count | 30 | 19 | 19 | 24 | 24 | 30 | 30 |
| **Overall** | | | | | | | |
| Phase 1 regressions | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Blocker issues | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

---

## 🚀 Quick Reference

### Essential Commands

**Backend**:
```bash
cd backend
pytest -q                    # Run all tests
pytest -v --tb=short        # Verbose with traceback
mypy .                       # Type checking
ruff check . && ruff format . # Format code
git commit -m "feat(rbac): ..."
```

**Frontend**:
```bash
cd frontend
npm run dev                  # Start dev server (localhost:5173)
npm run test -- --run       # Run tests
npm run build               # Build for production
npx playwright test --headed # Run E2E with UI
```

**Deployment**:
```powershell
.\DOCKER.ps1 -Start         # Start staging environment
.\DOCKER.ps1 -Stop          # Stop containers
.\NATIVE.ps1 -Start         # Start native dev environment
.\COMMIT_READY.ps1 -Quick   # Quick validation before commit
```

### Important Links
- **Swimlanes & Dependencies**: [docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md](../../docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md)
- **Architecture**: [docs/development/ARCHITECTURE.md](../../docs/development/ARCHITECTURE.md)
- **E2E Testing**: [docs/operations/E2E_TESTING_GUIDE.md](../../docs/operations/E2E_TESTING_GUIDE.md)
- **Deployment**: [docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.15.1.md](../../docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.15.1.md)
- **GitHub Project**: [Issues #116-#124](https://github.com/bs1gr/AUT_MIEEK_SMS/issues?q=label%3Aphase-2)

---

**Document Status**: ✅ Ready for Jan 27 kickoff
**Created**: January 7, 2026
**Owner**: Tech Lead
**Next**: Review this document on Jan 27 morning before standup
