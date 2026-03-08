# Agent Coordination System - Complete Overview

**Version**: 1.0
**Date**: January 5, 2026
**Purpose**: Explain how agents coordinate work across sessions without duplication

---

## 🎯 The Problem (Why This System Exists)

When multiple agents work on a project:
- Agent A does work, stops, and doesn't document where they left off
- Agent B arrives, doesn't know what A did, and either:
  - Re-does the work (wasting time)
  - Conflicts with A's changes (creating chaos)
  - Works on something A was already doing (duplication)

**Solution**: A coordination system that tells every agent:
1. What's happening NOW
2. Where the last agent left off
3. What the next action is
4. How to update the state for the next agent

---

## 📊 The System at a Glance

```text
┌─────────────────────────────────────────────────────────────────┐
│  AGENT ARRIVES & PICKS UP WORK                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: READ AGENT_QUICK_START.md (5 min)                      │
│          ↓                                                       │
│          "Go read ACTIVE_WORK_STATUS.md to see current state"   │
│          ↓                                                       │
│  Step 2: OPEN docs/ACTIVE_WORK_STATUS.md                        │
│          ↓                                                       │
│          Current items with status:                             │
│          - PHASE1-001: ✅ DONE                                   │
│          - PHASE1-002: 🟦 IN PROGRESS (git add/commit/push)      │
│          - PHASE1-003: 🟥 NOT STARTED (git checkout -b...)      │
│          ↓                                                       │
│  Step 3: PICK AN ITEM (usually IN PROGRESS or NOT STARTED)      │
│          ↓                                                       │
│          Click "Next Action" section                            │
│          ↓                                                       │
│  Step 4: EXECUTE THE NEXT ACTION                                │
│          ↓                                                       │
│  Step 5: UPDATE ACTIVE_WORK_STATUS with your progress          │
│          ↓                                                       │
│  Step 6: COMMIT/PUSH your changes                               │
│          ↓                                                       │
│  Step 7: MARK THE ITEM AS DONE (or blocked, or in-progress)    │
│          ↓                                                       │
│  NEXT AGENT ARRIVES: Repeats from Step 1 (knows exactly        │
│                       where you left off)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

```text
---

## 📁 The Three Key Documents

### 1. **AGENT_QUICK_START.md** (Entry Point)

- **Who reads it**: Every agent first
- **What it says**: "Read ACTIVE_WORK_STATUS, find your task, do it, update the status"
- **Length**: 5 minutes
- **You are here**: ← This document is basically the extended version of this

### 2. **ACTIVE_WORK_STATUS.md** (Source of Truth)

- **Who reads it**: Every agent, repeatedly
- **What it contains**:
  - Current version and release target
  - Latest test results
  - List of all active work items with status (🟥 NOT STARTED, 🟦 IN PROGRESS, ✅ DONE, 🟨 BLOCKED)
  - "Next Action" for each item (exact command or task)
  - Blockers and who needs to unblock them
  - Links to implementation docs
- **Length**: 3-5 minutes to scan
- **Updated By**: Every agent after they work
- **Authority**: This is the official state; all other docs are reference

### 3. **AGENT_CONTINUATION_PROTOCOL.md** (The Manual)

- **Who reads it**: Agents who need deep context
- **What it says**: "Here's the format for ACTIVE_WORK_STATUS, here's how to update it, here's when to escalate"
- **Length**: 10 minutes for full read
- **Updated By**: Project lead only (when system changes)

---

## 🔄 Workflow: How Agents Coordinate

### Before Work (Agent Arrival)

```text
Time: 0 min
Agent: "I'm ready to work"

↓ Read AGENT_QUICK_START.md
  Status: "Go read ACTIVE_WORK_STATUS.md"

↓ Open ACTIVE_WORK_STATUS.md
  Find current items:
  - PHASE1-002: 🟦 IN PROGRESS

    Owner: Agent-Copilot
    Started: 2026-01-05 16:00
    Last Update: 2026-01-05 17:30
    Progress: "✓ Type-safety cleanup complete"
    Next Action: "git add/commit/push"

↓ Decision: Continue PHASE1-002 (highest priority, in progress)

Time: 3 min (ready to start work)

```text
### During Work

```text
Time: 3-15 min
Agent: Working on PHASE1-002 (committing type-safety changes)

↓ Execute next action: git add, git commit, git push

↓ Update ACTIVE_WORK_STATUS immediately:
  - Owner: Agent-Copilot (still)
  - Status: 🟦 IN PROGRESS → ✅ DONE
  - Progress: "✓ All changes committed and pushed"
  - Commit: "a1b2c3d (refactor: improve type safety)"

Time: 15 min (work done)

```text
### After Work (For Next Agent)

```text
Time: 15 min
Agent: "Work done, updating the state"

↓ Update ACTIVE_WORK_STATUS:
  - Last item: PHASE1-002 ✅ DONE
  - Next item: PHASE1-003 🟥 NOT STARTED
  - Blocker: None
  - Next Action: "git checkout -b feature/1.15.0-phase1"

↓ Add entry at top:
  UPDATED: 2026-01-05 18:00 UTC by Agent-Copilot
  WORKED ON: PHASE1-002 (type-safety frontend changes)
  STATUS: DONE
  COMMIT: a1b2c3d

↓ Commit ACTIVE_WORK_STATUS update to git

↓ Hand off to next agent

Time: 18 min (ready for next agent)

```text
### Next Agent Arrives (No Re-Planning)

```text
Time: Day 2, 09:00 UTC
New Agent: "I'm ready to work, what do I do?"

↓ Open ACTIVE_WORK_STATUS.md
  Last Update: 2026-01-05 18:00 UTC

↓ See PHASE1-003 status: 🟥 NOT STARTED
  Next Action: "git checkout -b feature/1.15.0-phase1"

↓ Know PHASE1-001 and PHASE1-002 are done (no duplication)

↓ Execute: git checkout -b feature/1.15.0-phase1

↓ NO REPLANNING. NO DUPLICATED WORK.

Time: 09:10 UTC (work started immediately)

```text
---

## 🟥 🟦 ✅ Understanding the Status Colors

| Color | Meaning | What to Do |
|-------|---------|-----------|
| 🟥 NOT STARTED | No one has worked on this | Pick it (if priority is high) |
| 🟦 IN PROGRESS | Someone is working on it | Continue their work using "Next Action" |
| ✅ DONE | Completed, no action needed | Review to learn context; move to next item |
| 🟨 BLOCKED | Stuck waiting for something | Check "Blocker" field; decide if you can unblock it |

---

## 🔗 Example: How PHASE1-002 Worked (Real Case)

**Session 1 (Jan 5, 16:00 UTC)**:

```text
PHASE1-002: Type-safety frontend changes
Status: 🟦 IN PROGRESS
Owner: Agent-Copilot
Next Action:
  1. Review diff: git diff ✓ (clean)
  2. Stage changes: git add... ← NEXT
  3. Commit: git commit -m "..."
  4. Push: git push origin main

```text
**Session 2 (Jan 5, 18:00 UTC)**:

```text
Agent picks up work:
1. Opens ACTIVE_WORK_STATUS.md
2. Sees PHASE1-002 IN PROGRESS
3. Reads "Next Action": git add/commit/push
4. Executes those commands
5. Updates ACTIVE_WORK_STATUS: Status = ✅ DONE
6. Commit: a1b2c3d (refactor: improve type safety)

```text
**Session 3 (Jan 6, 09:00 UTC)**:

```text
New agent arrives:
1. Opens ACTIVE_WORK_STATUS.md
2. Sees PHASE1-002 is ✅ DONE (not confused)
3. Sees PHASE1-003 is 🟥 NOT STARTED
4. Starts PHASE1-003 immediately (no re-planning)

```text
**Zero duplication. Zero confusion.**

---

## 📋 Key Rules (Non-Negotiable)

1. **Always start by reading ACTIVE_WORK_STATUS.md** — This is the source of truth
2. **Update it when you finish work** — Even if just 2 minutes of updates
3. **Mark blockers immediately** — Don't hide problems
4. **Never re-plan** — Only update status and next action
5. **Link everything** — PRs, issues, docs, commits
6. **Keep next actions detailed** — Include exact commands or file paths
7. **Timestamp all updates** — UTC timezone always
8. **Use instruction-order lock + evidence gates.** Execute owner instructions in the exact order provided and attach evidence per ordered step before claiming completion

---

## 🚨 What Happens If You Skip ACTIVE_WORK_STATUS

**Agent A does work, doesn't update status**:
- Agent B arrives → thinks nothing was done → redoes work
- Agent C arrives → sees duplicate work → confusion about which is right
- Agent D arrives → spends 1 hour figuring out what happened
- **Result**: 2 hours wasted instead of 30 seconds to update the doc

**So just update it.** 30 seconds saves hours.

---

## 🔄 Escalation: When You Get Stuck

**Example**: "I don't know if we should commit to `main` or `feature/$11.18.3-phase1`"

**Process**:
1. Don't guess. Open ACTIVE_WORK_STATUS.md
2. Find "Decision Points" table
3. Add your question:
   ```
   | Decision | Question | Impact | Owner | Deadline |
   |------|------|---|---|---|
   | BRANCH_STRATEGY | Commit to main or feature/$11.18.3-phase1? | Blocks PHASE1-002 | Tech lead | Jan 6 EOD |
   ```
4. Mark your work item as 🟨 BLOCKED
5. Work on a different item (don't wait)
6. When tech lead answers, unblock and continue

**No blocking, no waiting for someone to notice your problem.** Everything is visible.

---

## 📊 Metrics: How Well Is the System Working?

**Good signs**:
- ✅ Every agent reads ACTIVE_WORK_STATUS in the first 5 minutes
- ✅ No task is worked on by two agents simultaneously
- ✅ "Next Action" sections get done without additional clarification
- ✅ Blockers are discovered and escalated within 15 minutes
- ✅ No re-planning (each session takes 10% less time than last)

**Bad signs** (fix immediately):
- ❌ Agents asking "what should I work on?" (wasn't clear in next action)
- ❌ Two agents doing the same task (update status more frequently)
- ❌ "Next Action" is vague ("fix the thing") — make it specific
- ❌ Blockers surprise you (weren't documented in advance)

---

## 🎓 FAQ

**Q: What if ACTIVE_WORK_STATUS is outdated?**
A: Update it immediately with current info. Timestamp it. This doc is the source of truth, so keeping it current is everyone's job.

**Q: Can I work on multiple items at once?**
A: Only if you mark all of them as 🟦 IN PROGRESS. Better: focus on one until done, then move to next.

**Q: What if an item takes longer than I thought?**
A: Update ACTIVE_WORK_STATUS with new estimate and progress. Next agent will know you're still working on it.

**Q: Can I change the status format?**
A: No. The format is standardized so any agent can read it. If you need to change it, file an issue and wait for approval from the tech lead.

**Q: What if I find a bug while working on PHASE1-002?**
A: Document it in ACTIVE_WORK_STATUS under "Blockers" or create a separate item for it. Don't switch tasks mid-work.

---

## ✨ Summary

**The system is simple**:
1. There's one file that shows the state: `docs/ACTIVE_WORK_STATUS.md`
2. Every agent reads it first
3. Every agent updates it when they finish
4. Next agent knows exactly where the last one left off
5. **No re-planning. No duplication. No chaos.**

That's it. Everything else is just details and examples.

**Go read [AGENT_QUICK_START.md](./AGENT_QUICK_START.md) and pick your next task.**
