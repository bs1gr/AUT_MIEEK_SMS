# Workspace Agent Guide

This is the compact agent configuration package for the Student Management System repository. It is designed to give the next agent a fast, reliable entry point while keeping the authoritative policy documents as the source of truth.

## Priority

When working in this repository, follow instructions in this order:
1. System and platform instructions
2. `.github/copilot-instructions.md`
3. `docs/AGENT_POLICY_ENFORCEMENT.md`
4. This `AGENTS.md`
5. Task-specific instruction, prompt, and agent files under `.github/instructions/`, `.github/prompts/`, and `.github/agents/`

## Repository essentials

- This is a **solo-developer** project. Do not refer to stakeholders, committees, or external approval gates.
- **Instruction-first lock (mandatory):** never run a generic task or release sequence before re-reading `.github/copilot-instructions.md` and `docs/AGENT_POLICY_ENFORCEMENT.md` for the current session.
- **Order lock (mandatory):** if the owner provides ordered steps (for example installer-first), execute them in that exact order and provide evidence for each step before claiming completion.
- Use `docs/plans/UNIFIED_WORK_PLAN.md` as the single planning source of truth.
- Use `docs/DOCUMENTATION_INDEX.md` for navigation before creating or changing documentation.
- Do not claim success without real verification evidence.
- Use `./NATIVE.ps1 -Start` for development verification.
- Use `./DOCKER.ps1 -Start` for production deployment only.
- For backend tests, prefer `./RUN_TESTS_BATCH.ps1` over direct full-suite `pytest`.
- Respect bilingual i18n requirements in frontend work.
- Use Alembic migration workflows for schema changes.
- Do not create unnecessary documentation files.

## Session-start checklist

Use this checklist in **every new session** before doing substantive work:

1. Re-read `.github/copilot-instructions.md`.
2. Re-read `docs/AGENT_POLICY_ENFORCEMENT.md`.
3. Re-read this `AGENTS.md`.
4. Review the current work plan in `docs/plans/UNIFIED_WORK_PLAN.md`.
5. Review `docs/DOCUMENTATION_INDEX.md` if the session may touch documentation, release guidance, or navigation.
6. Check `git status` and note any uncommitted work.
7. Inspect the active task files and prompts below, and carry their constraints into the session.
8. Confirm the current version from `VERSION` and reconcile it with any release or workflow references you are about to use.
9. If this is a handoff or recovery session, summarize the current state, remaining gaps, the last verified evidence, and the exact next step before taking a new action.

## Mandatory fail-closed verification gates

Do **not** proceed past session start until all of the following are true:

- The current version is readable from `VERSION`.
- The required guidance files exist and were re-read in this session.
- The work plan and documentation index are known and were reviewed.
- The current git state is known, including whether there is any uncommitted work.
- The active task files, prompts, and instruction files have been inspected.
- If any of the above is unknown, ambiguous, or missing, stop and report that the session is not yet ready to proceed.

## Agent package

### Available custom agents

- `.github/agents/debug.agent.md`
  - Use for root-cause debugging, reproducing failures, and verifying fixes.
- `.github/agents/research.agent.md`
  - Use for investigation, comparisons, citations, and decision support without changing code.
- `.github/agents/spec.agent.md`
  - Use for feature discovery, requirements gathering, and implementation-ready specs.

### Reusable prompts

- `.github/prompts/code-review.prompt.md`
- `.github/prompts/commit.prompt.md`
- `.github/prompts/reflect.prompt.md`

### Reusable instructions

- `.github/instructions/git-message.instructions.md`
- `.github/instructions/code-review.instructions.md`
- `.github/instructions/test-generation.instructions.md`

### Session handoff and compliance reminders

- Treat the custom agent files, prompts, and instructions as the default operating package for the session.
- Do not skip the instruction-first read step, even if a prior session already covered it.
- Preserve the current state in the work plan and, when validation is involved, capture a state snapshot before claiming success.
- If the session is a handoff, explicitly restate the last verified state, the requested next step, and any unresolved blockers before changing code.

## Working pattern

### 1. Before changing code

- Check `git status`.
- Review `docs/plans/UNIFIED_WORK_PLAN.md`.
- Confirm whether there is any incomplete local work that must be handled first.

### 2. During implementation

- Prefer the smallest safe fix.
- Preserve existing style and APIs unless the change requires otherwise.
- For backend changes, validate behavior with targeted tests first when possible.
- For frontend changes, prefer targeted Vitest scope and native-mode smoke verification if behavior is visible.

### 3. Before claiming completion

- Read real outputs, not just exit codes.
- For backend validation, use `./RUN_TESTS_BATCH.ps1` or a targeted backend test command when appropriate.
- For release-sensitive changes, verify artifacts, signatures, or hashes when applicable.
- Record a state snapshot when the session is entering or exiting a validation-heavy phase.

## Quick command map

- Backend tests: `./RUN_TESTS_BATCH.ps1`
- Frontend tests: `npm --prefix frontend run test`
- Native verification: `./NATIVE.ps1 -Start`
- Production deployment: `./DOCKER.ps1 -Start`
- Pre-commit gate: `./COMMIT_READY.ps1 -Quick`
- Version check: read `VERSION`

## Guardrails

- Do not use direct `pytest` for the full backend suite.
- Do not hardcode UI strings.
- Do not edit the database schema directly.
- Do not create duplicate planning documents.
- Do not treat release workflow success as proof of code correctness unless the verification gates were actually run.

## Intent

This file is intentionally compact. It points agents to the authoritative repo guidance and makes the active workflow easier to follow in a single pass.
