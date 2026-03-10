# Agent Quick Start

**For**: AI agents, developers, and automation systems
**Read Time**: 5 minutes
**Current work/status**: [docs/plans/UNIFIED_WORK_PLAN.md](./plans/UNIFIED_WORK_PLAN.md)
**Documentation navigation**: [docs/DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

---

## Read these first

Before doing any work, read these in order:

1. `.github/copilot-instructions.md`
2. [`docs/AGENT_POLICY_ENFORCEMENT.md`](./AGENT_POLICY_ENFORCEMENT.md)
3. [`docs/plans/UNIFIED_WORK_PLAN.md`](./plans/UNIFIED_WORK_PLAN.md)
4. [`docs/DOCUMENTATION_INDEX.md`](./DOCUMENTATION_INDEX.md)
5. `VERSION`

---

## The TL;DR

1. Check `git status`
2. Read `docs/plans/UNIFIED_WORK_PLAN.md`
3. Use `docs/DOCUMENTATION_INDEX.md` to find the right reference docs
4. Do the work and verify it with evidence
5. Update `UNIFIED_WORK_PLAN.md` if active planning or status changed
6. Use `docs/reports/README.md` or `archive/README.md` only for historical context

---

## Current coordination rules

- **`docs/plans/UNIFIED_WORK_PLAN.md` is the active planning source of truth**
- **`docs/DOCUMENTATION_INDEX.md` is the navigation source of truth**
- **`docs/ACTIVE_WORK_STATUS.md` is historical only**
- Do **not** create parallel status trackers or new backlog docs
- When you make a success claim, include evidence (tests, logs, artifacts, or runtime verification)

---

## Quick start paths

### If you're picking up work for the first time

1. Open `docs/plans/UNIFIED_WORK_PLAN.md`
2. Identify the current phase, release state, or top pending item
3. Open `docs/DOCUMENTATION_INDEX.md`
4. Read only the docs relevant to that work area
5. Execute the next verified task

### If you're continuing ongoing work

1. Open `docs/plans/UNIFIED_WORK_PLAN.md`
2. Check the latest timestamp and current branch/state
3. Review `git status`
4. Use `docs/reports/README.md` or release docs only if historical session context is needed
5. Continue the next incomplete verified task

### If you need historical context

Use these in order:

1. `docs/reports/README.md`
2. `archive/README.md`
3. `docs/releases/`
4. Git history for a specific file

---

## Key files

| File | Purpose |
|------|---------|
| `docs/plans/UNIFIED_WORK_PLAN.md` | Current work, release state, and priorities |
| `docs/DOCUMENTATION_INDEX.md` | Canonical doc navigation |
| `docs/development/AGENT_CONTINUATION_PROTOCOL.md` | Current continuation workflow |
| `docs/AGENT_POLICY_ENFORCEMENT.md` | Mandatory project rules |
| `VERSION` | Current repo version |

---

## When something is unclear

Don't guess and don't create a new planning doc.

1. Re-check `UNIFIED_WORK_PLAN.md`
2. Re-check `DOCUMENTATION_INDEX.md`
3. Inspect the relevant code or tests
4. If the ambiguity affects current planning, update `UNIFIED_WORK_PLAN.md` with the clarified state

---

## Session checklist

- [ ] Read policy and instructions
- [ ] Checked `git status`
- [ ] Read `UNIFIED_WORK_PLAN.md`
- [ ] Used `DOCUMENTATION_INDEX.md` to find relevant references
- [ ] Verified changes before making claims
- [ ] Updated `UNIFIED_WORK_PLAN.md` if current work state changed

---

## Final note

If you remember only one thing: **start from `UNIFIED_WORK_PLAN.md`, not from old status files.**
