# Pre-Commit Guide (Unified)

**Version:** 2.1.0  
**Last Updated:** 2025-12-06  
**Scope:** Local dev + CI pre-commit automation

## 📌 Purpose

Single source of truth for pre-commit workflows, replacing multiple overlapping docs:

- `PRE_COMMIT_AUTOMATION.md`
- `PRECOMMIT_INSTRUCTIONS.md`
- `pre-commit-workflow.md`

## 🚀 Quick Start (2 minutes)

```powershell
# Standard validation (recommended)
./COMMIT_READY.ps1 -Standard

# Faster (skip full tests)
./COMMIT_READY.ps1 -Quick

# Full verification (all tests + Docker/Native health)
./COMMIT_READY.ps1 -Full

# Cleanup only (format, lint, temp files)
./COMMIT_READY.ps1 -Cleanup
```

**Optional AutoFix:** Add `-AutoFix` to apply formatting/import fixes automatically.

## 🎯 What COMMIT_READY Covers

- Backend: Ruff, pytest (full suite), dependency check
- Frontend: ESLint, TypeScript typecheck, Vitest
- Repo: Markdown lint, translation parity
- Cleanup: Python/Node caches, temp files, build artifacts
- Version checks: VERSION sync, docs headers

## 🔒 DEV_EASE Policy (Local Only)

- `DEV_EASE=true` allows opt-in skips/AutoFix **only for local runs**
- **Never enable in CI or production**; scripts enforce this restriction
- Goals: faster local iteration without weakening pipeline safety

## 🛠️ Pre-Commit Hook Installation

```powershell
python -m pip install --user pre-commit
cd "d:\SMS\student-management-system"
pre-commit install
pre-commit run --all-files   # optional first sweep
```

**Hooks Provided:** `.pre-commit-config.yaml` (backend import checker). Uses your active Python env; for isolation, run inside a venv with `backend/requirements.txt` installed.

**Sample Git Hook:** `.githooks/commit-ready-precommit.sample`  
**Install Helpers:** `scripts/install-git-hooks.ps1` (Windows), `scripts/install-git-hooks.sh` (POSIX)

## 🧭 Recommended Workflows

### Day-to-Day Dev

- Run `./COMMIT_READY.ps1 -Quick` before every commit
- Use `-AutoFix` to fix formatting/imports automatically
- If touching Docker/native startup logic, prefer `-Standard`

### Release / High-Risk Changes

- Run `./COMMIT_READY.ps1 -Full`
- Verify VERSION, CHANGELOG, TODO updates
- Ensure Docker/Native health checks pass

### CI Expectations

- CI runs equivalent of `-Standard` (no DEV_EASE allowed)
- Fails on lint/type/test errors or version drift

## 🔧 Troubleshooting

### Hook fails due to missing deps

- Install backend deps: `pip install -r backend/requirements.txt`
- Or run inside venv: `python -m venv .venv && .venv\Scripts\Activate.ps1`

### Slow runs

- Use `-Quick` locally; reserve `-Full` for pre-release

### Need to skip cleanup temporarily?

- Use `-SkipCleanup` (local only, not in CI)

## 🗃️ Migration Notes

- Legacy scripts (`COMMIT_PREP.ps1`, `PRE_COMMIT_CHECK.ps1`, `PRE_COMMIT_HOOK.ps1`, `SMOKE_TEST_AND_COMMIT_PREP.ps1`) are deprecated; use `COMMIT_READY.ps1`
- Legacy docs archived to `archive/pre-commit-2025-12-06/`

## ✅ Checklist (Use Before Commit)

- [ ] `./COMMIT_READY.ps1 -Quick` (or -Standard/-Full as needed)
- [ ] VERSION, CHANGELOG.md, TODO.md updated if relevant
- [ ] No lint/type/test failures
- [ ] No uncommitted generated files

## 📚 References

- `.pre-commit-config.yaml`
- `scripts/install-git-hooks.ps1`, `scripts/install-git-hooks.sh`
- `COMMIT_READY.ps1` (help: `./COMMIT_READY.ps1 -Help`)
- `docs/development/GIT_WORKFLOW.md`
