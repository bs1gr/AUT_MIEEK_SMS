# Agent Continuation Protocol

**Version**: 2.0
**Last Updated**: 2026-03-10
**Audience**: AI agents, developers, and automation systems continuing active work

---

## Purpose

This protocol explains how to continue work without duplicating effort or following stale handoff documents.

---

## Current authority order

Use documents in this order:

1. `VERSION`
2. `.github/copilot-instructions.md`
3. `docs/AGENT_POLICY_ENFORCEMENT.md`
4. `docs/plans/UNIFIED_WORK_PLAN.md`
5. `docs/DOCUMENTATION_INDEX.md`

Historical reports, session summaries, and archived materials are supporting context only.

---

## Before you start work

1. Run `git status`
2. Read `docs/plans/UNIFIED_WORK_PLAN.md`
3. Identify the active phase, candidate scope, or current blocker
4. Use `docs/DOCUMENTATION_INDEX.md` to locate the relevant docs
5. Read the affected code/tests before making changes

---

## During work

1. Stay inside the verified scope
2. Do not create new parallel status trackers
3. Use evidence gates before claiming success
4. If current planning state changes, update `UNIFIED_WORK_PLAN.md`
5. If documentation structure changes materially, update `DOCUMENTATION_INDEX.md`

---

## After work

1. Re-check `git status`
2. Run the smallest relevant verification for your changes
3. Read the actual output/results
4. Update `UNIFIED_WORK_PLAN.md` if current state changed
5. Summarize what changed and how it was verified

---

## How to use historical context safely

If you need prior-session context, use these in order:

1. `docs/reports/README.md`
2. `archive/README.md`
3. `docs/releases/`
4. specific historical files surfaced by the documentation index

Do not treat historical status docs as authoritative current instructions.

---

## Blockers and ambiguity

When something is unclear:

1. Re-check the current work plan
2. Re-check the documentation index
3. Inspect the actual code or tests
4. If the ambiguity changes current planning, record the clarified state in `UNIFIED_WORK_PLAN.md`

---

## Important note

`docs/ACTIVE_WORK_STATUS.md` is no longer the live coordination file. It remains only as a historical stub for backward compatibility with old links.
