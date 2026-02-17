# Feature Roadmap Planning - v1.17.7+ Maintenance Phase

**Created**: February 5, 2026
**Planning Period**: Post v1.17.7 Release
**Status**: Framework prepared for owner input
**Owner**: Solo Developer decision-making

---

## 🆕 Maintenance Updates (Feb 5-6, 2026)

- ✅ **Legacy installer detection hardening complete** – `AppExistsOnDisk` now recognizes historical launchers ("SMS Toggle" `.bat/.cmd`, metadata files, Docker compose) and reads the exact version from `VERSION`, ensuring all upgrades remain in-place. Rebuilt installer (`SMS_Installer_1.17.7.exe`, 7.95 MB) passes smoke tests.
- ✅ **Stability monitoring log initialized** – First entry recorded on Feb 5 documenting the installer rebuild, version audit, and smoke test so ongoing health checks now have a baseline.
- 📦 **Installer scenarios archived for now** – Owner deferred remaining scenarios (3–8); installer testing is not required at this time.

These notes keep the roadmap aligned with current maintenance progress while the owner prepares to select the next feature focus.

---

## 📋 Roadmap Planning Framework

This document provides structure for planning the next feature release based on:
1. ✅ Completed installer testing results
2. ✅ Production stability monitoring
3. ✅ User feedback collection
4. ✅ Code health assessment

---

## 🔄 Phase Planning Template

### Phase Structure

Each future phase follows this proven pattern:

**Work Breakdown**:
- Requirement analysis & technical design
- Backend implementation & API layer
- Frontend foundation (translations, hooks, API integration)
- Frontend UI components & pages
- Integration testing & bug fixes
- Documentation & production release

**Duration**: Owner commits time when phase begins

**Quality Gates**:
- ✅ All backend tests passing (740+)
- ✅ All frontend tests passing (1800+)
- ✅ Zero linting errors (or acceptable documented warnings)
- ✅ E2E tests for critical workflows
- ✅ Complete translations (EN/EL)
- ✅ Documentation complete

---

## 🎯 Potential Next Features (To Be Prioritized)

### Candidate 1: Email Report Delivery (OPTIONAL-002)
**Effort**: 4-6 hours
**Dependencies**: APScheduler (complete)
**Features**:
- Email recipients per report
- Template customization
- Delivery tracking
- Unsubscribe management

**Pros**:
- Builds on existing scheduler
- High user value
- Moderate complexity
- Clear requirements

**Cons**:
- SMTP configuration required
- Email deliverability concerns
- Unsubscribe management complexity

**Effort**: 4-6 hours (including testing, documentation)

---

### Candidate 2: ESLint Code Health Refactoring
**Effort**: 4-6 hours
**Dependencies**: None
**Features**:
- Fix 161 `any` types → proper TypeScript
- Remove 23 console.log statements
- Fix React hook patterns
- Add missing i18n keys

**Pros**:
- Improves code maintainability
- Zero breaking changes
- Well-defined scope
- Can be done incrementally

**Cons**:
- No user-facing value
- 7 warnings already acceptable
- Lower priority than features

**Effort**: 4-6 hours (including type migration testing)

---

### Candidate 3: Advanced Analytics Dashboard
**Effort**: 40-60 hours (new feature, spans multiple sessions)
**Dependencies**: Report system (complete)
**Features**:
- Time-series metrics visualization
- Custom dashboard creation
- KPI tracking
- Export to reports

**Pros**:
- High user value
- Builds on reports
- Differentiates product

**Cons**:
- Significant complexity
- New charting library
- Database performance tuning needed

**Estimated Effort**: 3 weeks (backend + frontend + testing)

---

### Candidate 4: Multi-Language Support Enhancement
**Effort**: 20-40 hours
**Dependencies**: Current i18n framework
**Features**:
- Add French (FR) or other language
- RTL language support (Arabic, Hebrew)
- Locale-specific formats (dates, numbers)

**Pros**:
- Expands market reach
- Uses existing framework
- Modular implementation

**Cons**:
- Translation resources needed
- Testing across locales complex
- Limited immediate ROI

**Effort**: 20-40 hours (implementation + QA)

---

### Candidate 5: User Profile & Preferences
**Effort**: 20-40 hours
**Dependencies**: RBAC (ready)
**Features**:
- User preferences (theme, language, notifications)
- Profile customization
- Notification settings
- Data export (GDPR)

**Pros**:
- Quick to implement
- Improves UX
- Compliance feature (GDPR)

**Cons**:
- Limited business value
- Lower priority
---

---

## 🔍 Input Gathering Checklist

Before finalizing roadmap for next phase, collect:

### Installer Testing Results
- [ ] All 8 scenarios tested and documented
  - Fresh install successful?
  - Upgrades preserve data?
  - Docker handling correct?
  - Uninstall clean?
- [ ] Issues found: Document severity and type
- [ ] User feedback: What broke? What worked well?

### Production Monitoring
- [ ] System stable for 2+ weeks?
- [ ] Any crashes or errors detected?
- [ ] Performance metrics within targets?
- [ ] User adoption metrics (logins, features used)?

### User Feedback
- [ ] Most requested features?
- [ ] Pain points experienced?
- [ ] Feature wishlist gathered?
- [ ] Support tickets analyzed?

### Code Health
- [ ] Critical technical debt identified?
- [ ] Performance bottlenecks found?
- [ ] Security improvements needed?
- [ ] Refactoring opportunities?

---

## 📊 Decision Matrix

Use this to prioritize candidates:

| Feature | Effort | Value | Risk | Owner Priority |
|---------|--------|-------|------|----------------|
| Email Delivery | 4-6 hrs | Medium | Low | TBD |
| ESLint Cleanup | 4-6 hrs | Low | None | Optional |
| Analytics | 40-60 hrs | High | Medium | TBD |
| Multi-Language | 20-40 hrs | Medium | Low | TBD |
| User Preferences | 20-40 hrs | Low | Low | TBD |

---

## 🗺️ Implementation Approaches

### Approach A: Single Feature Focus
**Scope**: Complete installer testing, then implement one feature (Email OR Analytics)

**Steps**:
1. Complete maintenance phase (installer testing)
2. Implement selected feature (4-6 hrs to 40-60 hrs depending on feature)
3. Testing & release when owner decides ready

**Rationale**: Clear focus, one complete feature per release

---

### Approach B: Multiple Small Features
**Scope**: Complete installer testing, then implement several small improvements

**Options**:
- Email Delivery (4-6 hrs)
- User Preferences (20-40 hrs)
- ESLint Cleanup (4-6 hrs)
- Combine any of these

**Rationale**: Ship multiple smaller improvements when owner prioritizes

---

### Approach C: Large Feature + Refactoring
**Scope**: Complete installer testing, then tackle bigger feature with quality improvements

**Options**:
- Analytics Dashboard (40-60 hrs) + ESLint Cleanup (4-6 hrs)
- Other combinations owner selects

**Rationale**: Significant enhancement paired with maintenance work

---

## 📝 Owner Decision Fields

**Owner Update (Feb 6, 2026)**:

```markdown
## Owner Decision (Feb 6, 2026)

**Installer Testing Completed?**: [ ] Yes [x] No (Archived/Deferred)
**Major Issues Found?**: [ ] Yes [x] No - Description: N/A (deferred)
**Production Stability Confirmed?**: [x] Yes (fullstack install validated)

**Selected Implementation**:
1. Email Report Delivery (OPTIONAL-002) (Effort: 4-6 hrs, Priority: High)

**Selected Approach**: [x] A (Single Feature) [ ] B (Multiple Small) [ ] C (Large + Refactor)
**Rationale**: Fast, user-visible value; leverages existing scheduler; low risk.

**Start Date**: ___________
**Target Release Date**: ___________
```

---

## 🔗 Related Documents

- **Work Plan**: [docs/plans/UNIFIED_WORK_PLAN.md](../plans/UNIFIED_WORK_PLAN.md)
- **Installer Testing**: [INSTALLER_TESTING_TRACKER.md](../INSTALLER_TESTING_TRACKER.md)
- **Stability Monitoring**: [monitoring/STABILITY_MONITORING.md](../monitoring/STABILITY_MONITORING.md)
- **Phase 6 Reference**: [docs/plans/UNIFIED_WORK_PLAN_ARCHIVE_PHASE4_PHASE5.md](../plans/UNIFIED_WORK_PLAN_ARCHIVE_PHASE4_PHASE5.md)

---

**Created**: February 5, owner input
**Status**: Awaiting owner decisions on installer testing results and feature priorities
**Status**: Awaiting owner guidance after maintenance phase completion
