# Phase 2 PR Review Guide

**PR Title:** `chore(ci): consolidate 3 workflow pairs - Phase 2`  
**Status:** Ready for review  
**Review Time:** ~30-45 minutes for thorough review  
**Risk Level:** 🟢 LOW

---

## 🎯 What You're Reviewing

**3 workflow consolidations:**
1. Maintenance workflows unified (task selector)
2. Installer workflows dual-mode (release + repo-commit)
3. Commit-ready workflows optional cleanup (fast + cleanup)

**Result:** 37 workflows → 34 workflows (-8%), ~500 lines duplication removed

**Key:** 100% backward compatible, all new features opt-in

---

## 📋 Review Checklist

### Phase 1: Quick Overview (5 minutes)

- [ ] Read PR title and description
- [ ] Understand the 3 consolidations
- [ ] Review the risk assessment (should say LOW)
- [ ] Check timeline (should be 2-3 weeks)

### Phase 2: Code Review (15 minutes)

**For each of the 3 enhanced workflows:**

1. **Check YAML Syntax**
   - [ ] Valid YAML structure
   - [ ] No indentation errors
   - [ ] All brackets/braces balanced

2. **Verify Job Dependencies**
   - [ ] New jobs have correct `needs:` clauses
   - [ ] Conditional logic correct (`if:` statements)
   - [ ] No circular dependencies

3. **Check Inputs/Outputs**
   - [ ] New input parameters documented
   - [ ] Output values properly set
   - [ ] Types match usage

4. **Backward Compatibility**
   - [ ] Old behavior preserved (when input not provided)
   - [ ] Defaults are sensible
   - [ ] No breaking changes

### Phase 3: Testing Strategy Review (10 minutes)

- [ ] Consolidation 1 test cases make sense
  - [ ] task=all → all 8 tasks run
  - [ ] task=stale-cleanup → only stale runs
  - [ ] Backward compat test included

- [ ] Consolidation 2 test cases make sense
  - [ ] Release mode test (default behavior)
  - [ ] Repo-commit mode test (new feature)
  - [ ] PR fallback test (protected branch)

- [ ] Consolidation 3 test cases make sense
  - [ ] Default fast path test
  - [ ] Cleanup option test
  - [ ] Multi-platform coverage

### Phase 4: Risk Assessment (5 minutes)

- [ ] Risk level rated as LOW
- [ ] Rollback plan exists
- [ ] Rollback time < 30 minutes
- [ ] No production impact until tested

### Phase 5: Timeline & Approval (5 minutes)

- [ ] Timeline is realistic (2-3 weeks)
- [ ] Testing happens after merge
- [ ] Cleanup only after tests pass
- [ ] Monitoring period included

---

## 🔍 HOW TO REVIEW EACH CONSOLIDATION

### Consolidation 1: Maintenance Workflows

**File to review:** `.github/workflows/orchestrated-maintenance.yml`

**Changes to look for:**

```yaml
# NEW: Task determination job
determine-tasks:
  outputs:
    run_stale: bool
    run_workflow_cleanup: bool
    run_health_check: bool
    # ... etc

# EXISTING jobs now depend on determine-tasks
cleanup-workflow-runs:
  needs: [determine-tasks]
  if: needs.determine-tasks.outputs.run_workflow_cleanup == 'true'
```

**What to check:**
- ✅ determine-tasks job is first
- ✅ All jobs depend on it
- ✅ Conditionals check outputs
- ✅ All 8 tasks have proper conditions

**Questions to ask:**
- Does task selection logic make sense?
- Will backward compat work (legacy cleanup_level input)?
- Are all 8 tasks properly guarded?

---

### Consolidation 2: Installer Workflows

**File to review:** `.github/workflows/installer.yml`

**Changes to look for:**

```yaml
# NEW: Mode determination
determine-mode:
  outputs:
    output_mode: string
    target_branch: string

# EXISTING: Build job
build:
  needs: [determine-mode]
  
# NEW: Conditional output jobs
publish-release:
  if: needs.determine-mode.outputs.output_mode == 'release'

commit-to-repo:
  if: needs.determine-mode.outputs.output_mode == 'repo-commit'
```

**What to check:**
- ✅ Mode determination happens first
- ✅ Build job is platform-independent
- ✅ Output jobs are mutually exclusive
- ✅ Code signing logic handles both secrets and CI

**Questions to ask:**
- Does the dual-mode output make sense?
- Will release mode work as before?
- Can repo-commit create PRs on protected branches?
- Is code signing fallback safe?

---

### Consolidation 3: Commit-Ready Workflows

**File to review:** `.github/workflows/commit-ready-smoke.yml`

**Changes to look for:**

```yaml
# EXISTING: Ubuntu + Windows jobs (unchanged)
commit-ready-ubuntu:
  # ... existing smoke test logic

commit-ready-windows:
  # ... existing smoke test logic

# NEW: Conditional cleanup job
cleanup-smoke-test:
  if: github.event_name == 'workflow_dispatch' && 
      github.event.inputs.include_cleanup == 'true'
  strategy:
    matrix:
      os: [windows-latest, ubuntu-latest, macos-latest]
```

**What to check:**
- ✅ Existing jobs unchanged
- ✅ Cleanup job only on manual dispatch with flag
- ✅ Cleanup fixture creation & verification logic
- ✅ Multi-platform matrix correct

**Questions to ask:**
- Does cleanup fixture logic test the right things?
- Will conditional prevent unnecessary cleanup tests?
- Are cleanup results clearly reported?

---

## 📊 Review Workflow

### Option 1: GitHub UI (Easiest)

1. **Go to PR**
   - Click the PR number link
   - You're now on the GitHub PR page

2. **Review Files Changed**
   - Click "Files changed" tab
   - Review each of the 3 workflow files
   - Add comments as needed

3. **Check Conversation**
   - Click "Conversation" tab
   - Read PR description
   - Review any comments from others

4. **Approve or Request Changes**
   - Click "Review changes" button
   - Select "Approve" or "Request changes"
   - Add summary comment

### Option 2: Command Line

```bash
# View PR details
gh pr view <PR_NUMBER>

# View PR diff
gh pr diff <PR_NUMBER>

# Review specific file
gh pr diff <PR_NUMBER> -- .github/workflows/orchestrated-maintenance.yml

# Check if ready to merge
gh pr checks <PR_NUMBER>
```

### Option 3: Local Review

```bash
# Fetch the PR branch locally
gh pr checkout <PR_NUMBER>

# Review files in your editor
code .github/workflows/orchestrated-maintenance.yml

# Run tests locally if desired
gh workflow run orchestrated-maintenance.yml -f task=all

# Go back to main
git checkout main
```

---

## ✅ APPROVAL CHECKLIST

### Code Review Team
- [ ] YAML syntax valid (all 3 files)
- [ ] Job dependencies correct
- [ ] Conditional logic correct
- [ ] No security issues
- [ ] Code quality acceptable
- [ ] Backward compatible

### DevOps/Operations
- [ ] Testing strategy sound
- [ ] Rollback plan feasible
- [ ] Risk assessment accurate
- [ ] Timeline realistic
- [ ] Monitoring plan adequate

### Project Lead
- [ ] Overall approach makes sense
- [ ] Team capacity for 2-3 week timeline
- [ ] Expected benefits justify the work
- [ ] No conflicts with other initiatives

---

## 🚨 Red Flags (Fail on These)

❌ **YAML Syntax Errors** - Workflows won't run  
❌ **Circular Dependencies** - Jobs will deadlock  
❌ **Breaking Changes** - Backward compatibility broken  
❌ **Missing Rollback Plan** - Can't undo if issues found  
❌ **Unsafe Conditionals** - Wrong jobs might run  

---

## 🟡 Yellow Flags (Discuss)

⚠️ **Complex Conditional Logic** - Hard to understand/maintain  
⚠️ **Missing Documentation** - Inline comments missing  
⚠️ **Risky Test Approach** - Testing might miss edge cases  
⚠️ **Timeline Concerns** - 2-3 weeks too long/short  

---

## 💬 HOW TO COMMENT

### Inline Comments (GitHub UI)

1. Hover over the line you want to comment on
2. Click the comment icon that appears
3. Type your comment
4. "Comment" to post, or "Start a review" to batch comments

### Comment Types

**Question:**
```
Question: Will this backward compatibility also work with older 
automation that uses the legacy `cleanup_level` input?
```

**Suggestion:**
```
Suggestion: Add a comment explaining why we check for the 
`task` input first before falling back to `cleanup_level`.
```

**Concern:**
```
Concern: The PR fallback mechanism for repo-commit mode - 
will it work reliably on all protected branches? Should we test this?
```

**Approval:**
```
Looks good! The dual-mode approach is clean and maintains 
backward compatibility. The testing plan is comprehensive.
```

---

## 📝 Review Template

Here's a template for your review comment:

```
## Review Summary

### ✅ What looks good
- [Strength 1]
- [Strength 2]
- [Strength 3]

### ⚠️ Questions / Concerns
- [Question 1 - can be inline]
- [Question 2]

### 🟢 Recommendation
Approve / Request changes / Needs discussion

### Timeline
Ready to merge after [any other changes needed]
```

---

## 🎯 Decision Framework

### Approve if:
- ✅ YAML syntax valid
- ✅ Logic correct
- ✅ Backward compatible
- ✅ Testing plan complete
- ✅ Rollback plan adequate

### Request Changes if:
- ⚠️ Syntax errors found
- ⚠️ Logic incorrect
- ⚠️ Breaking changes
- ⚠️ Insufficient testing
- ⚠️ Missing rollback plan

### Needs Discussion if:
- ❓ Timeline concerns
- ❓ Scope questions
- ❓ Approach disagreement

---

## 📞 Key Questions to Ask

**About backward compatibility:**
- "Will workflows that don't pass the new parameters still work?"
- "What happens if someone uses an old automation script?"

**About testing:**
- "Are all edge cases covered?"
- "What if tests fail partway through?"

**About rollback:**
- "Can we revert these changes without data loss?"
- "Is <30 minute rollback actually achievable?"

**About timeline:**
- "Is 2-3 weeks realistic for a team of X people?"
- "Can we parallelize the testing phase?"

---

## ✨ Example Reviews

### Good Approve Comment
```
Reviewed all 3 consolidations. Code is clean, logic is sound, 
backward compatibility preserved. The testing strategy is thorough 
and the rollback plan is simple. Ready to merge.

Suggestions:
1. Consider adding a comment explaining the conditional logic 
   in determine-tasks job
2. Test the repo-commit PR fallback early when testing starts

Approving.
```

### Good Request Changes Comment
```
Consolidations look good overall, but I have a concern:

The repo-commit mode doesn't handle the case where the 
installer file already exists. What's the expected behavior?
- Overwrite and commit?
- Skip and warn?
- Fail with error?

Please clarify in either code comments or a brief update to 
the PR description. Then I'll approve.
```

---

## 🚀 After Review

**If approved:**
```bash
# Wait for all reviewers to approve
# Then merge the PR
gh pr merge <PR_NUMBER> --squash --delete-branch
```

**If changes requested:**
```bash
# Author makes changes
# Re-request review
gh pr ready <PR_NUMBER>
```

---

## 📚 Quick Reference

| Item | File | Location |
|------|------|----------|
| **PR Description** | PR_TEMPLATE_PHASE2.md | `.github/workflows/` |
| **Testing Plan** | EXECUTION_PLAN_PHASE2_MERGE.md | `memory/` |
| **Risk Assessment** | PR description | In the PR |
| **Rollback Plan** | PR description | In the PR |
| **Consolidation Details** | Specific memory files | `memory/` |

---

## 💡 Tips

1. **Read the PR description first** - It has all the context
2. **Review test cases carefully** - They explain what should happen
3. **Think about edge cases** - What if X goes wrong?
4. **Trust the rollback plan** - If concerned, ask for clarification
5. **Ask questions** - Better to clarify now than discover issues later

---

**Estimated Review Time:** 30-45 minutes  
**Difficulty:** Medium  
**Decision Required:** Approve / Request Changes / Needs Discussion

Ready to review? Start with the PR description and work through the checklist above.
