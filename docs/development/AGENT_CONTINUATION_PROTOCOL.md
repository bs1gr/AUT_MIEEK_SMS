# Agent Continuation Protocol
## How to Understand and Continue Work Without Duplication

**Version**: 1.0
**Last Updated**: January 5, 2026
**Audience**: AI agents, developers, and automation systems picking up ongoing work

---

## 🎯 The Problem This Solves

When multiple agents work on a project sequentially or in parallel, they need to:
- Understand what's in progress and what's completed
- Know exactly where the last agent left off
- Continue without re-planning or duplicating effort
- Make decisions that are consistent with previous sessions
- Update the project state so the next agent has clarity

**Without this protocol:** Agents re-plan, duplicate tasks, work on conflicting goals, and create chaos.

---

## 📌 Core Principle: Single Source of Truth

### The Hierarchy (in order of authority)
1. **`docs/ACTIVE_WORK_STATUS.md`** ← **PRIMARY** — Current state of all active work items
2. **`docs/releases/RELEASE_PREPARATION_$11.15.2.md`** ← Active release timeline & Phase 1 tasks
3. **`docs/misc/TODO.md`** ← Historical backlog and completed phases (reference only)
4. **Session summaries** (`docs/development/sessions/`) ← Context for understanding decisions

**Rule**: If ACTIVE_WORK_STATUS conflicts with other docs, ACTIVE_WORK_STATUS wins. Other docs are for context.

---

## 🔄 Agent Workflow: "Before You Work"

### Step 1: Read the State (5 minutes)

**File to read first:**
```
docs/ACTIVE_WORK_STATUS.md
```

**What to extract:**
- Current version and release target
- Phase/milestone in progress
- List of active work items with status (not-started/in-progress/blocked/done)
- What was last worked on (last commit, last session date)
- Any blockers or decision points

**Sample extraction:**
```
CURRENT STATE (from ACTIVE_WORK_STATUS.md):
- Version: 1.14.2 (stable)
- Target: 1.15.0 (Phase 1, Jan 7–20)
- In Progress: Backend test reconciliation (60+ failures from APIResponse format)
- Last Worked: Jan 5, 2026, 15:30 UTC (type-safety frontend cleanup)
- Blocker: Backend test count mismatch in release prep doc
```

### Step 2: Understand the Phase (3 minutes)

**File to read:**
```
docs/releases/RELEASE_PREPARATION_$11.15.2.md (Phase 1 section)
```

**What to extract:**
- Phase name and timeline
- List of 8 improvements with links to implementation docs
- Success criteria (metrics, test results)
- Checklist status (which items have PRs, which are stuck)

### Step 3: Map Your Task (2 minutes)

**Ask yourself:**
- Is my work tied to an active phase? (Check Phase 1 in release prep doc)
- Is my task on the ACTIVE_WORK_STATUS list?
- Does my work unblock any blockers listed?
- Will my work change the status of any active items?

---

## ✅ How to Update ACTIVE_WORK_STATUS

### When You Start Work

**Find your item in ACTIVE_WORK_STATUS:**
```yaml
- Task: "Backend test reconciliation"
  Status: "not-started" ← Change to "in-progress"
  Owner: "" ← Add your name/agent ID
  Started: "" ← Add date/time
  Last Update: "" ← Add current date/time
```

### As You Work

**After each significant change**, update the item:

```yaml
- Task: "Backend test reconciliation"
  Status: "in-progress"
  Owner: "Agent-Copilot"
  Started: "2026-01-05 16:00 UTC"
  Last Update: "2026-01-05 16:30 UTC"
  Progress: |
    ✓ Ran backend pytest: 304 tests total
    ⚠️ 60 failures confirmed (APIResponse format)
    → Next: Categorize failures by type
  Blockers: None
  PR/Commit: None yet
```

### When You Finish

**Mark the task as done and record the output:**

```yaml
- Task: "Backend test reconciliation"
  Status: "done"
  Owner: "Agent-Copilot"
  Completed: "2026-01-05 17:15 UTC"
  Result: |
    ✓ All 60 failures analyzed
    ✓ Root cause confirmed (APIResponse wrapper format)
    ✓ Fix patterns documented in docs/TEST_FAILURE_PATTERNS.md
    ✓ PR ready: feature/backend-test-fixes (#47)
  PR/Commit: "feature/backend-test-fixes (#47)"
  Links: "docs/TEST_FAILURE_PATTERNS.md, docs/releases/$11.15.2_test_status.md"
```

### If You Hit a Blocker

**Record it immediately:**

```yaml
- Task: "Backend test reconciliation"
  Status: "blocked"
  Blocker: "Cannot determine if failures are pre-existing or new (no baseline test run from $11.15.2 release)"
  Blocker Reason: "Release prep doc claims 'all tests passing' but 60 failures exist on current main"
  Decision Needed: |
    1. Should we treat these as pre-existing and defer to Phase 1 task #4?
    2. Or should we fix them now as part of Phase 0 stabilization?
  Escalation: "Release lead must clarify Phase 0 test expectations"
```

---

## 📊 ACTIVE_WORK_STATUS Format (YAML)

```yaml
# ACTIVE_WORK_STATUS.md Template

project: "Student Management System"
version: "1.14.2"
release_target: "1.15.0"
release_date: "2026-01-24"

phase: "Phase 1: Infrastructure Improvements"
phase_start: "2026-01-07"
phase_end: "2026-01-20"
phase_status: "planning"  # planning / in-progress / testing / blocked / done

last_session:
  date: "2026-01-05"
  time: "15:30 UTC"
  agent: "Agent-Copilot"
  summary: "Frontend type-safety cleanup, session summary update"
  commits: "966e2bdc1, fce18340d"

current_state:
  working_branch: "main"
  uncommitted_files: 3  # RBACPanel, StudentPerformanceReport, SESSION_FINAL_SUMMARY
  test_status:
    backend: "⚠️ 60 failures (APIResponse format), needs reconciliation"
    frontend: "✅ 1189 passing (latest run Jan 5, 15:28 UTC)"
  blocker_count: 1
  ready_to_merge: false

work_items:
  - id: "PHASE1-001"
    title: "Backend test reconciliation (Phase 0 gap)"
    status: "not-started"  # not-started / in-progress / blocked / done
    priority: "critical"
    owner: ""
    started: ""
    last_update: "2026-01-05 15:45 UTC"

    description: |
      Reconcile discrepancy between RELEASE_PREPARATION_$11.15.2.md (claims "all tests passing")
      and actual state (60+ test failures from APIResponse format standardization).
      Determine if these are pre-existing or new regressions.

    acceptance_criteria:
      - Backend pytest run completed and output recorded
      - Failure categories documented
      - Root causes mapped to commits
      - Decision made: defer to Phase 1 or fix now
      - RELEASE_PREPARATION_$11.15.2.md Phase 0 claims updated

    blockers: "None"
    blocked_by: "None"
    related_issues: "#0"
    related_docs: "docs/releases/RELEASE_PREPARATION_$11.15.2.md"

    next_action: |
      1. Run: cd backend && python -m pytest -q
      2. Categorize failures by error type (response format / assertion / etc)
      3. Cross-reference commits 6d72ca496 and a1535d074 (APIResponse changes)
      4. Update ACTIVE_WORK_STATUS with findings
      5. Create follow-up task if defer decision made

    progress: ""
    pr_link: ""
    commit_link: ""

  - id: "PHASE1-002"
    title: "Commit & document type-safety frontend changes"
    status: "in-progress"
    priority: "high"
    owner: "Agent-Copilot"
    started: "2026-01-05 16:00 UTC"
    last_update: "2026-01-05 17:30 UTC"

    description: |
      Commit the type-safety fixes in RBACPanel (Axios response typing) and
      StudentPerformanceReport (error handler + generic config updater).
      Update release notes for $11.15.2 to reflect this maintenance work.

    acceptance_criteria:
      - All 3 local changes committed
      - Commit message mentions both files and type-safety improvements
      - SESSION_FINAL_SUMMARY_2025-01-05.md updated with results
      - Release notes updated if these are shipping features

    blockers: "None"
    progress: |
      ✓ Type-safety cleanup complete (RBACPanel, StudentPerformanceReport)
      ✓ Frontend tests passing (1189 tests)
      ✓ Session summary updated with addendum
      → Next: git add/commit

    next_action: |
      1. Review diff: git diff (already done, confirmed clean)
      2. Stage changes: git add frontend/src/components/...
      3. Commit: git commit -m "refactor(frontend): improve type safety in RBAC and reports"
      4. Verify: git log -1
      5. Update ACTIVE_WORK_STATUS as done

    pr_link: ""
    commit_link: ""

  - id: "PHASE1-003"
    title: "Create feature branch for Phase 1 improvements"
    status: "not-started"
    priority: "high"
    owner: ""
    started: ""
    last_update: "2026-01-05 15:45 UTC"

    description: |
      Create and push the feature branch for Phase 1 work per
      RELEASE_PREPARATION_$11.15.2.md. This branch will house all 8 improvements.

    acceptance_criteria:
      - Branch created: feature/$11.14.2-phase1
      - Pushed to origin
      - Branch protection rules applied (if applicable)
      - Linked to Phase 1 plan in GitHub Projects or Issues

    blockers: "None (can run in parallel with PHASE1-001/002)"
    next_action: |
      git checkout -b feature/$11.14.2-phase1
      git push origin feature/$11.14.2-phase1

    pr_link: ""
    commit_link: ""

notes: |
  - All dates/times in UTC to avoid timezone confusion
  - Each work item has a clear "next_action" for the next agent
  - Blockers are explicit so agents can escalate or work around them
  - Links to implementation docs allow agents to dive deep without re-reading entire release plan
  - Status values are standardized: not-started / in-progress / blocked / done
