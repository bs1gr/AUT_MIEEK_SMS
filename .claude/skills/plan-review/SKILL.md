---
name: plan-review
description: Audit docs/plans/UNIFIED_WORK_PLAN.md for staleness and accuracy against actual git history and code state, and report gaps. Use when asked to review, audit, or check the work plan / UNIFIED_WORK_PLAN.md, or before cutting a release.
---

You audit `docs/plans/UNIFIED_WORK_PLAN.md` — this project's sole planning
source of truth (per `CLAUDE.md`) — against ground truth: git history and the
actual code. The goal is to catch two failure modes: **staleness** (recent
commits not yet reflected in the plan) and **inaccuracy** (claims in the plan
that no longer match what the code does).

Use PowerShell for all shell commands — Bash's PATH lacks `git` and other
POSIX tools in this environment.

## Steps

1. **Read ground truth.**
   - `Get-Content VERSION` — authoritative current version.
   - `git log --oneline -15`
   - `git tag --sort=-v:refname | Select-Object -First 5`
   - `git describe --tags` — the `-N-g<hash>` suffix tells you exactly how
     many commits have landed since the last tag.
   - `git status` — should be clean; note if not.

2. **Read the plan.** Read `docs/plans/UNIFIED_WORK_PLAN.md` in full (it's
   long; don't stop at the first section). Pay closest attention to the
   top-most section(s) — that's the active/most-recent work the status line
   at the top of the file should match.

3. **Find the staleness gap.** Compare the commit count from
   `git describe --tags` against what the plan's top section(s) actually
   document. List any commits on `main` since the last tag (or since the
   plan's most recent documented commit) that have no corresponding entry —
   name each by hash + one-line summary. A plan is stale whenever `git log`
   shows commits the document doesn't mention.

4. **Spot-check technical claims, don't just trust prose.** For the 1-2 most
   recent substantive entries, pick the specific claims that are falsifiable
   against the current codebase (a fixed path, a code pattern, a file that
   should/shouldn't exist, a CHANGELOG.md structure) and verify them directly
   with Grep/Read — e.g. if the plan says "script X now derives path Y
   instead of hardcoding Z", grep for both the old and new pattern in the
   named file. Report each claim as verified or contradicted with the
   file:line evidence, not just "looks fine."

5. **Cross-check auto-memory for undocumented follow-ups.** If this session
   has access to the project's memory index (`MEMORY.md` under the memory
   directory named in the system prompt), check the most recent session
   entries against the plan. Session memories sometimes record open
   follow-ups (e.g. "found an unrelated bug, out of scope, not yet filed")
   that never made it into the plan. Flag any such gaps by name.

6. **Report, don't silently fix.** Summarize: what's verified accurate (with
   evidence), what's stale (commits/follow-ups missing), and any contradicted
   claims. Ask before editing `UNIFIED_WORK_PLAN.md` yourself — updating it is
   a fast follow-up this skill can do on request, but the audit itself is
   read-only.

## Notes

- This project has no approval gates for routine work (solo dev, per
  `CLAUDE.md`), but editing the plan is still a distinct action from
  auditing it — keep the two separate unless asked to do both.
- Don't confuse `CLAUDE.md`'s own version header with staleness in
  `UNIFIED_WORK_PLAN.md` — `CLAUDE.md` explicitly says to verify version from
  the `VERSION` file, so a stale-looking header there is by design, not a
  finding.
- `UNIFIED_WORK_PLAN.md` is intentionally append-heavy (newest work at the
  top, older cycles pushed down toward the historical archive link at the
  bottom) — don't flag older sections as "out of date" merely for being old;
  staleness means *missing recent entries*, not *containing old ones*.
