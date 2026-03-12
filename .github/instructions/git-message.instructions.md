---
description: Generate commit messages that match this repository's verification-first workflow and conventional commit style.
applyTo: "**/*"
---

Use conventional commit messages that reflect the work actually completed.

Repository-specific requirements:
- Prefer formats like `fix: ...`, `feat: ...`, `docs: ...`, `test: ...`, `refactor: ...`, `ci: ...`, or `chore: ...`
- Keep the subject concise, specific, and truthful
- Use an optional scope only when it adds clarity
- Do not mention work that has not been completed
- Do not mention verification unless verification was actually performed
- Do not suggest bypassing repository policy by default

When relevant, align with:
- `.github/copilot-instructions.md`
- `docs/AGENT_POLICY_ENFORCEMENT.md`
- `AGENTS.md`

Repository workflow reminders:
- Verification-first is mandatory; `COMMIT_READY.ps1` is the normal pre-commit gate
- Backend validation should respect `RUN_TESTS_BATCH.ps1` policy
- Avoid fake stakeholder or approval language
- Keep planning references aligned with `docs/plans/UNIFIED_WORK_PLAN.md`

Good commit messages should:
- describe the actual change, not the aspiration
- avoid vague summaries like `update stuff`
- avoid bundling unrelated changes into one summary
- stay readable to a future maintainer scanning history
