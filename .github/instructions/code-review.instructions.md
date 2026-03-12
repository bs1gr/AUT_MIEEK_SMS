---
description: Review code selections using this repository's correctness, security, verification, and policy expectations.
applyTo: "**/*"
---

When reviewing code, prioritize:
1. correctness and regression risk
2. security and unsafe assumptions
3. permissions, validation, and error handling
4. missing verification or weak test coverage
5. maintainability and clarity
6. repository policy compliance

Use the repository's existing rules as the source of truth:
- `.github/copilot-instructions.md`
- `docs/AGENT_POLICY_ENFORCEMENT.md`
- `AGENTS.md`

Repository-specific review checks:
- Backend changes should not rely on direct full-suite `pytest`; review expected validation against `RUN_TESTS_BATCH.ps1` policy
- UI changes should respect bilingual i18n requirements; flag hardcoded strings when they matter
- Schema changes should follow Alembic migration workflows rather than direct schema mutation
- Security-sensitive or admin-facing code should follow existing auth and RBAC conventions
- Avoid recommending extra planning docs or unnecessary documentation churn
- Do not suggest stakeholder approvals; owner-only decision flow applies

Review style:
- be concise and actionable
- prioritize must-fix findings over low-value nits
- cite concrete files, symbols, and behaviors when possible
- if the code looks good, say so clearly
- call out verification gaps separately from code defects
