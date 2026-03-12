---
description: Generate tests that follow this repository's backend, frontend, verification, and safety constraints.
applyTo: "**/*"
---

Generate tests that match the repository's actual test architecture and policies.

Primary rules:
- Prefer the smallest focused test that covers the behavior change
- Preserve existing test style and fixtures already used in the surrounding files
- Do not invent new testing frameworks or patterns when existing ones already solve the need
- Include both happy-path and relevant edge-case coverage

Backend test guidance:
- The repository forbids direct full-suite local `pytest` runs for broad validation; prefer guidance compatible with `RUN_TESTS_BATCH.ps1`
- For targeted backend tests, follow existing pytest fixture patterns in `backend/tests/`
- Respect API response wrapper conventions where applicable
- Prefer tests that isolate the changed behavior rather than exercising unrelated surfaces

Frontend test guidance:
- Follow existing Vitest and Testing Library patterns in `frontend/`
- Respect i18n behavior; avoid brittle assertions against text when a more stable selector exists
- Prefer user-visible behavior over implementation-detail assertions

Repository-aware expectations:
- `.github/copilot-instructions.md`
- `docs/AGENT_POLICY_ENFORCEMENT.md`
- `AGENTS.md`

When suggesting verification steps, keep them realistic for this repo:
- backend: targeted tests first, then appropriate batch-runner validation when scope warrants it
- frontend: targeted vitest scope first, then broader validation if needed
- UI changes may also need native-mode verification via `NATIVE.ps1 -Start`
