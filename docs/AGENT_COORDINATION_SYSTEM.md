# Agent Coordination System

**Version**: 2.0
**Updated**: 2026-03-10
**Purpose**: Explain how agents coordinate current work without duplication or stale handoff documents

---

## Core principle

Current coordination uses **one planning source of truth** and **one navigation source of truth**:

1. [`docs/plans/UNIFIED_WORK_PLAN.md`](./plans/UNIFIED_WORK_PLAN.md) — current state, priorities, release path
2. [`docs/DOCUMENTATION_INDEX.md`](./DOCUMENTATION_INDEX.md) — canonical documentation map

Historical reports and archives are supporting context only.

---

## The coordination model

### Before work

1. Read `.github/copilot-instructions.md`
2. Read `docs/AGENT_POLICY_ENFORCEMENT.md`
3. Check `git status`
4. Read `docs/plans/UNIFIED_WORK_PLAN.md`
5. Use `docs/DOCUMENTATION_INDEX.md` to find the relevant references

### During work

1. Stay within the current verified task scope
2. Do not create parallel status trackers
3. Verify changes before calling them complete
4. If the active plan or release state changes, update `UNIFIED_WORK_PLAN.md`

### After work

1. Re-check `git status`
2. Verify the affected scope (tests, docs, runtime evidence, or release artifacts as applicable)
3. Update `UNIFIED_WORK_PLAN.md` if current status changed
4. Reference historical reports only if they add evidence or context

---

## Current document authority

| Document | Role |
|----------|------|
| `docs/plans/UNIFIED_WORK_PLAN.md` | Current work and release authority |
| `docs/DOCUMENTATION_INDEX.md` | Canonical navigation map |
| `docs/reports/README.md` | Historical report entry point |
| `archive/README.md` | Archived material entry point |
| `docs/ACTIVE_WORK_STATUS.md` | Historical stub only |

---

## What changed from the old system

The older coordination model relied on `docs/ACTIVE_WORK_STATUS.md` as the live state tracker. That file is now historical only.

Why:

- it conflicted with `UNIFIED_WORK_PLAN.md`
- it carried stale Jan/Feb 2026 work state
- it caused agent navigation drift

All current coordination should now point to `UNIFIED_WORK_PLAN.md` instead.

---

## Avoiding duplicate work

To avoid duplication:

1. Start with the work plan, not with old session notes
2. Check the latest verified scope and next release state
3. Use the documentation index to find the right reference docs
4. Treat monthly reports and archived sessions as historical context, not active instructions

---

## When you are blocked

If you hit an ambiguity:

1. Re-check `UNIFIED_WORK_PLAN.md`
2. Re-check `DOCUMENTATION_INDEX.md`
3. Inspect the actual code or tests
4. If the ambiguity affects current work planning, record the clarified state in `UNIFIED_WORK_PLAN.md`

Do not create a separate blocker/status markdown file unless it is genuinely required and already fits an indexed documentation area.

---

## Summary

The coordination system is intentionally simple:

- **Current work** → `UNIFIED_WORK_PLAN.md`
- **Current docs map** → `DOCUMENTATION_INDEX.md`
- **Historical context** → `docs/reports/README.md` and `archive/README.md`

That keeps the workspace navigable and prevents stale handoff loops.
