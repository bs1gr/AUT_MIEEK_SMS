# Day 2: Code Quality Action Plan (Jan 19, 2026)

**Status**: 🟢 KICKOFF
**Target**: Reduce ESLint + TypeScript errors
**Timeline**: 6-8 hours
**Owner**: AI Agent
**Goal**: Clean up code quality issues to unblock Phase 4

---

## 📋 Tasks for Day 2

### Task 1: ESLint Warnings Analysis (1 hour)

**Goal**: Identify top categories of ESLint warnings

**Steps**:
1. Run ESLint with full report
2. Categorize violations by type
3. Identify quick wins
4. Prioritize fixes

**Expected Output**: ESLint categories with counts

---

### Task 2: TypeScript Errors Analysis (30 min)

**Goal**: Identify TypeScript blocking issues

**Steps**:
1. Run `npx tsc --noEmit`
2. List all type errors
3. Categorize by severity
4. Identify patterns

**Expected Output**: TypeScript error report with categorization

---

### Task 3: ESLint Quick Wins (2-3 hours)

**Goal**: Fix top 50 ESLint issues (unused vars, simple fixes)

**Strategy**:
- Fix unused variables automatically
- Fix simple formatting issues
- Remove dead code
- Batch similar fixes together

**Expected Outcome**: ESLint warnings reduced 241 → <150

---

### Task 4: TypeScript Fixes (1-2 hours)

**Goal**: Fix blocking TypeScript errors

**Focus Areas**:
- Analytics components
- Import/export types
- API response types
- Test fixtures

**Expected Outcome**: 0 blocking TypeScript errors

---

### Task 5: Verification (1 hour)

**Goal**: Ensure no regressions

**Tests to Run**:
1. ✅ Frontend tests (1,249 vitest)
2. ✅ E2E tests (19 critical path)
3. ✅ Pre-commit validation (COMMIT_READY.ps1 -Quick)

**Expected Outcome**: All tests passing, no regressions

---

## 🚀 Getting Started

### Phase 1: ESLint Analysis

Command to analyze:

```bash
npm --prefix frontend run lint -- --format json > eslint-report.json

```text
Then categorize by rule/severity.

### Phase 2: TypeScript Analysis

Command to check:

```bash
npx tsc --noEmit --listFiles

```text
Or simpler:

```bash
cd frontend && npx tsc --noEmit

```text
### Phase 3: Fix & Test

Apply fixes in batches, test after each batch to catch regressions.

---

## 📊 Success Metrics

| Metric | Start | Target | Status |
|--------|-------|--------|--------|
| ESLint Warnings | 241+ | <150 | TBD |
| TypeScript Errors | ~15 | 0 | TBD |
| Frontend Tests | 1,249 | 1,249 | ✅ |
| E2E Tests | 19 | 19 | ✅ |

---

**Last Updated**: Jan 19, 2026 - KICKOFF
**Next Review**: After Task 5 verification
