# Workspace Agent Guide

This repository uses project-specific Copilot guidance from `.github/copilot-instructions.md` and `docs/AGENT_POLICY_ENFORCEMENT.md`.

## Priority

When working in this repository, follow instructions in this order:
1. System and platform instructions
2. `.github/copilot-instructions.md`
3. `docs/AGENT_POLICY_ENFORCEMENT.md`
4. This `AGENTS.md`
5. Task-specific instruction, prompt, and agent files under `.github/instructions/`, `.github/prompts/`, and `.github/agents/`

## Repository essentials

- This is a **solo-developer** project. Do not refer to stakeholders, committees, or external approval gates.
- **Instruction-first lock (mandatory):** never run a generic task/release sequence before re-reading `.github/copilot-instructions.md` and `docs/AGENT_POLICY_ENFORCEMENT.md` for the current session.
- **Order lock (mandatory):** if the owner provides ordered steps (for example installer-first), execute in that exact order and provide evidence per step before claiming completion.
- Use `docs/plans/UNIFIED_WORK_PLAN.md` as the single planning source of truth.
- Do not claim success without real verification evidence.
- Use `./NATIVE.ps1 -Start` for development verification.
- Use `./DOCKER.ps1 -Start` for production deployment only.
- For backend tests, prefer `./RUN_TESTS_BATCH.ps1` over direct full-suite `pytest`.
- Do not create unnecessary documentation files.
- Respect bilingual i18n requirements in frontend work.
- Use Alembic migration workflows for schema changes.

## Available custom agent files

- `.github/agents/debug.agent.md`
- `.github/agents/research.agent.md`
- `.github/agents/spec.agent.md`

## Available reusable prompts

- `.github/prompts/code-review.prompt.md`
- `.github/prompts/commit.prompt.md`
- `.github/prompts/reflect.prompt.md`

## Available instruction files

- `.github/instructions/git-message.instructions.md`
- `.github/instructions/code-review.instructions.md`
- `.github/instructions/test-generation.instructions.md`

## Intent

This file is intentionally lightweight. It points agents to the authoritative repo guidance instead of duplicating large policy blocks.
