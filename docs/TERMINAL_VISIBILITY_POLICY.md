# 🚨 Terminal Visibility Policy - MANDATORY

**Date**: January 24, 2026
**Status**: CRITICAL - Enforced Immediately
**Authority**: User Requirement - Non-Negotiable

---

## 📋 The Rule

**ALL processes MUST be visible in the terminal. ZERO EXCEPTIONS.**

```powershell
# ❌ FORBIDDEN - isBackground=true (NEVER)

.\RUN_TESTS_BATCH.ps1           # Running hidden = HANG DETECTION IMPOSSIBLE

# ✅ REQUIRED - isBackground=false (ALWAYS)

.\RUN_TESTS_BATCH.ps1           # Running visible = HANG DETECTION POSSIBLE

```text
---

## 🔴 Why This Matters

**What happened (Jan 24, 2026):**
1. Tests were launched with `isBackground=true`
2. Tests hung silently (no visible output)
3. Agent couldn't detect the hang
4. User waited 1+ hour thinking tests were running
5. **Result**: Wasted time + confusion

**What should happen:**
1. Tests launch with visible terminal output
2. Hang becomes immediately visible
3. User can see "stuck at Batch 3" or similar
4. Can stop and restart immediately
5. **Result**: Transparency + quick issue resolution

---

## 📌 Implementation Guidelines

### For All Terminal Commands

```powershell
# Rule: If you're running ANY external process/script, it MUST be visible

isBackground=false              # DEFAULT for everything

# ONLY exception: If user explicitly requests background execution

# "Run this in the background" → Then use isBackground=true with EXPLICIT acknowledgment

```text
### For Test Runners

```powershell
# ❌ WRONG

.\RUN_TESTS_BATCH.ps1 -BatchSize 5    # (runs hidden)

# ✅ CORRECT

.\RUN_TESTS_BATCH.ps1 -BatchSize 5    # (visible, can monitor)
# User sees: "Batch 1: [████████░░] 45s" real-time

# User can ctrl+c immediately if hung

```text
### For Long-Running Operations

```powershell
# ❌ WRONG

docker build -t sms:latest .          # (background, can't see progress)

# ✅ CORRECT

docker build -t sms:latest .          # (visible, see every step)
# User sees: "Step 5/12: RUN pip install -r..."

# User can interrupt if something goes wrong

```text
---

## ✅ Checklist Before Running Any Process

- [ ] Is this a long-running operation? (test, build, deployment)
- [ ] Can user see the output in real-time?
- [ ] If hung, can user detect it immediately?
- [ ] If I set `isBackground=true`, did user explicitly request it?

**If ANY answer is NO → Use `isBackground=false`**

---

## 🛑 Refactoring Requirement

**Effective Immediately (Jan 24, 2026):**

All background task invocations in this session and future sessions MUST be refactored to:
1. Always show terminal output
2. Use progress indicators (percentages, elapsed time, batch counters)
3. Allow user to see stuck processes in real-time
4. Allow user to interrupt with Ctrl+C

**Scripts to audit:**
- [RUN_TESTS_BATCH.ps1](../../RUN_TESTS_BATCH.ps1)
- [COMMIT_READY.ps1](../../COMMIT_READY.ps1)
- [DOCKER.ps1](../../DOCKER.ps1)
- [NATIVE.ps1](../../NATIVE.ps1)

---

## 📊 Real-Time Monitoring Example

**What the user should see:**

```text
⏳ Backend Test Runner - RUN_TESTS_BATCH.ps1
════════════════════════════════════════════════

Batch 1 of 16: core_routes_test (5 files)
├─ test_auth.py ..................... ✓
├─ test_core.py ..................... ✓
├─ test_db.py ....................... ✓
├─ test_models.py ................... ✓
└─ test_utils.py .................... ✓
   ✅ PASSED (47/47) - 12.3s

Batch 2 of 16: admin_routes_test (5 files)
├─ test_admin.py .................... ✓
├─ test_permissions.py .............. ✓
   ⏳ (current)

Elapsed: 1m 23s | Remaining: ~8m 15s

```text
User can see:
- ✅ Exactly which batch is running
- ✅ How many files in batch
- ✅ Progress percentage
- ✅ Elapsed/remaining time
- ✅ Can detect immediately if stuck on a file

---

## 🚨 Hang Detection Signs

When processes are visible, you can instantly see:

```text
⏳ STUCK: Batch 3 showing same file for >60 seconds
❌ TIMEOUT: No output for 2+ minutes
🔄 LOOP: Seeing repeated error messages
💥 CRASH: Sudden stop with error, not completing

```text
When processes are hidden (background=true):

```text
😐 User stares at blank screen
⏸️ Can't tell if running or hung
🕐 Waits 30 minutes hoping it completes
😤 Finally kills it manually

```text
---

## 📝 Implementation Notes

**For Test Runners:**
- Add progress counter: "Batch X of 16"
- Show file names as they process
- Display pass/fail symbols in real-time
- Show total elapsed time
- Update every 2-3 seconds

**For Build Operations:**
- Show step indicator: "Step X of Y"
- Show current operation (e.g., "Installing dependencies...")
- Display file paths being processed
- Show bytes/MB progress if applicable

**For Deployments:**
- Show container startup stages
- Display migration progress
- Show service health checks in real-time
- Display final ready status

---

## 🔐 User Control

User must be able to:
1. **See** what's happening (terminal visibility)
2. **Stop** if something is wrong (Ctrl+C works)
3. **Monitor** progress (real-time indicators)
4. **Know** when complete (clear final message)

**Example terminal flow:**

```powershell
PS> .\RUN_TESTS_BATCH.ps1 -BatchSize 5

📊 Backend Test Runner v1.0
════════════════════════════════════════════════════════════════

Batch 1/16: core (5 files) - Started 14:32:45
  ✓ test_auth.py (8 tests, 2.1s)
  ✓ test_models.py (12 tests, 3.4s)
  ✓ test_db.py (15 tests, 4.2s)
  ✓ test_routes.py (18 tests, 5.1s)
  ✓ test_utils.py (6 tests, 1.8s)
  ✅ Batch 1 PASSED (59/59 tests) - 16.6s

Batch 2/16: admin (5 files) - Started 14:33:02
  ✓ test_permissions.py (22 tests, 3.5s)
  ✓ test_roles.py (18 tests, 2.9s)
  ^ (running...)

[Ctrl+C to stop]  [Est. remaining: 7m 32s]

```text
---

## 💡 Benefits of Terminal Visibility

| Aspect | Hidden (Background) | Visible (Terminal) |
|--------|-------------------|------------------|
| **Hang Detection** | ❌ Impossible | ✅ Immediate |
| **User Frustration** | 😤 High | 😊 Low |
| **Debugging Failed Tests** | 🚫 Blind | 👀 Clear |
| **Confidence** | 😐 Uncertain | 💪 Confident |
| **Time to Resolution** | 🐢 Hours | ⚡ Minutes |

---

## 🎯 Going Forward

**RULE**: Assume `isBackground=false` unless explicitly told otherwise.

**Each task must answer:**
- Can user see it? (YES)
- Can user stop it? (YES)
- Can user know when done? (YES)

---

**Effective Date**: January 24, 2026, 14:45 UTC
**Enforced By**: User Mandate
**No Exceptions**: ZERO

---

This policy prevents wasted debugging time and keeps operations transparent.
