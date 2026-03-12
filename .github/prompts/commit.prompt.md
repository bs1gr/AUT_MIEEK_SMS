---
agent: ask
name: commit
description: Draft a conventional commit message for the current staged or described change, aligned to repository verification policy.
model: GPT-5.4
---

Create a concise, repository-appropriate commit message.

Requirements:
- Use conventional commit format such as `fix: ...`, `feat: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `ci: ...`, or `chore: ...`
- Keep the subject line specific and readable
- Prefer the smallest accurate scope
- Do not invent work that was not actually done
- If verification is mentioned, it must reflect real verification already performed
- Do not encourage bypassing verification or pre-commit policy unless the user explicitly asks and the repository policy exception truly applies

Repository context to respect:
- `.github/copilot-instructions.md`
- `docs/AGENT_POLICY_ENFORCEMENT.md`
- verification-first workflow via `COMMIT_READY.ps1`
- no fake stakeholder language

Output format:

## Suggested commit
`<type>(<optional-scope>): <summary>`

## Why
- 1-3 bullets summarizing the actual change

If the requested change appears too large for one commit, say so and suggest 2-3 smaller commit splits.
