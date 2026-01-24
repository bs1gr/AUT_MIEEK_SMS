# Git Workflow & Commit Standards

**Last Updated**: 2026-01-13
**Version**: 2.2

This document consolidates all git workflow procedures, commit standards, and automation tools for the Student Management System project.

## Quick Start

### 1. Automated Pre-Commit Workflow (Recommended)

First, ensure you have installed the git hooks (one-time setup):
`.\scripts\setup_git_hooks.ps1`

```powershell
# Run comprehensive pre-commit checks and generate commit message

.\COMMIT_READY.ps1

# Or use specific mode

.\COMMIT_READY.ps1 -Mode quick      # Fast validation (2-3 min)
.\COMMIT_READY.ps1 -Mode standard   # Standard workflow (5-8 min) - DEFAULT
.\COMMIT_READY.ps1 -Mode full       # Comprehensive (15-20 min)
.\COMMIT_READY.ps1 -Mode cleanup    # Cleanup only (1-2 min)

# Review generated message (if using -GenerateCommit)

Get-Content .\commit_msg.txt

# Commit with generated message

git add .
git commit -F commit_msg.txt
git push origin main

```text
### 2. Manual Workflow

```powershell
# Run smoke tests (quick mode)

.\COMMIT_READY.ps1 -Mode quick

# Stage changes

git add <files>

# Commit with conventional message

git commit -m "type(scope): subject"

# Push

git push origin main

```text
## Commit Message Standards

### Conventional Commits Format

```text
<type>(<scope>): <subject>

<body>

<footer>

```text
### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add password reset` |
| `fix` | Bug fix | `fix(api): correct grade calculation` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Code style (formatting) | `style: fix indentation` |
| `refactor` | Code restructuring | `refactor(db): optimize queries` |
| `perf` | Performance improvement | `perf(api): add response caching` |
| `test` | Add/update tests | `test(grades): add validation tests` |
| `build` | Build system changes | `build: update Docker image` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `chore` | Maintenance | `chore: update dependencies` |

### Scopes

Common scopes in this project:

- `auth` - Authentication/authorization
- `api` - Backend API endpoints
- `ui` - Frontend user interface
- `db` - Database schema/queries
- `docker` - Docker/deployment
- `docs` - Documentation
- `ux` - User experience improvements

### Subject Guidelines

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Limit to 72 characters
- Be specific and descriptive

### Body Guidelines

- Separate from subject with blank line
- Use bullet points for multiple changes
- Explain **what** and **why**, not **how**
- Reference issues/PRs: `Closes #123`

### Examples

**Good commit messages:**

```text
feat(ux): add universal autosave pattern

- Implement autosave for NotesSection and CourseEvaluationRules
- Add visual save indicators with CloudUpload icon
- Reduce API calls by 85% through intelligent debouncing
- Eliminate manual save buttons for cleaner UX

Closes #234

```text
```text
fix(api): correct grade percentage calculation

The absence penalty was being applied twice when calculating
final percentages. Now applies once at the end as intended.

Fixes #456

```text
```text
docs: update all references to v2.0 consolidated scripts

- Replace RUN.ps1 → DOCKER.ps1
- Replace INSTALL.ps1 → DOCKER.ps1 -Install
- Update all supporting documentation
- Fix test failures in RBAC and QNAP deployment tests

All legacy script references updated to point to consolidated
DOCKER.ps1 (production) and NATIVE.ps1 (development).

```text
## Pre-Commit Automation

### Pre-commit automation — COMMIT_READY.ps1 (Unified)

COMMIT_READY.ps1 is the consolidated pre-commit helper that replaced the older
`COMMIT_PREP.ps1` / `PRE_COMMIT_CHECK.ps1` / `SMOKE_TEST_AND_COMMIT_PREP.ps1` family.
It provides a single, consistent experience for pre-commit validation and automated cleanup.

Key features:

- **Modes**: quick (2–3 min), standard (5–8 min), full (15–20 min), cleanup (1–2 min)
- **Code quality**: Ruff (backend), ESLint (frontend), TypeScript checks
- **Tests**: pytest (backend: 379 tests) and Vitest (frontend: 1189 tests)
- **Translation integrity checks** (i18n parity across EN/EL locales)
- **Optional native/docker health checks** (full mode)
- **AutoFix support** (formatting, imports) and commit message generation
- **CI/CD integration** with GitHub Actions (npm caching, parallel jobs)

Usage examples:

```powershell
# Standard validation (recommended)

.\COMMIT_READY.ps1 -Mode standard

# Fast pre-commit checks

.\COMMIT_READY.ps1 -Mode quick

# Comprehensive validation (includes health checks)

.\COMMIT_READY.ps1 -Mode full

# Cleanup-only

.\COMMIT_READY.ps1 -Mode cleanup

# Auto-fix where supported (use DEV_EASE if you intend to skip tests/cleanup locally)

.\COMMIT_READY.ps1 -Mode standard -AutoFix

```text
### Developer note — DEV_EASE policy

--------------------------------

DEV_EASE is an opt-in flag that is now strictly reserved for local pre-commit operations.
It must not be used to modify application runtime behavior or CI. To use DEV_EASE for
local pre-commit skips (tests/cleanup) or AutoFix, set DEV_EASE in your shell before running
COMMIT_READY — e.g., PowerShell: `$env:DEV_EASE = 'true'`.

To ensure pre-commit checks run for all contributors, we provide a sample hook at
`.githooks/commit-ready-precommit.sample` and cross-platform installers under `scripts/`.

### Quality Gates Summary

| Component | Tool | Coverage | Status |
|-----------|------|----------|--------|
| **Backend** | Ruff + MyPy | 100% | ✅ 0 issues |
| **Frontend** | ESLint + TypeScript | 100% | ✅ 0 issues |
| **Tests** | Pytest + Vitest | 1568 total tests | ✅ All passing |
| **i18n** | Translation integrity | EN/EL parity | ✅ Validated |
| **CI/CD** | GitHub Actions | Parallel jobs + caching | ✅ Optimized |

## Workflow Examples

### Feature Development

```powershell
# 1. Create feature branch

git checkout -b feature/autosave-notes

# 2. Make changes

# ... edit files ...

# 3. Run automated workflow

.\COMMIT_READY.ps1 -Mode standard

# 4. Review and commit

Get-Content .\commit_msg.txt
git add .
git commit -F commit_msg.txt

# 5. Push branch

git push origin feature/autosave-notes

# 6. Create PR on GitHub

```text
### Hotfix

```powershell
# 1. Create hotfix branch from main

git checkout -b hotfix/auth-bug main

# 2. Fix the issue

# ... edit files ...

# 3. Quick test and commit

.\COMMIT_READY.ps1 -Mode quick
git add .
git commit -m "fix(auth): correct token validation logic"

# 4. Push and merge immediately

git push origin hotfix/auth-bug
# Merge PR on GitHub

```text
### Documentation Update

```powershell
# 1. Update docs

# ... edit *.md files ...

# 2. Skip tests for doc-only changes (use DEV_EASE)

$env:DEV_EASE = 'true'
.\COMMIT_READY.ps1 -Mode quick

# 3. Commit

git add docs/
git commit -F commit_msg.txt
git push origin main

```text
## Release Workflow

### 1. Prepare Release

```powershell
# Update version

echo "1.17.1" > VERSION

# Update CHANGELOG.md

# Move [Unreleased] section to [1.17.1] - YYYY-MM-DD

# Commit version bump

git add VERSION CHANGELOG.md
git commit -m "chore(release): bump version to 1.17.1"

```text
### 2. Create Tag

```powershell
# Create annotated tag

git tag -a $11.17.1 -m "Release $11.17.1: Description

- Feature 1
- Feature 2
- Bug fix 1"

# Push tag

git push origin $11.17.1

```text
### 3. Create GitHub Release

```powershell
# Use GitHub CLI (if available)

gh release create $11.9.7 --notes-file docs/releases/$11.9.7.md

# Or create manually on GitHub

# Navigate to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new

```text
## Common Tasks

### Amend Last Commit

```powershell
# Make additional changes

# ... edit files ...

# Add to last commit

git add .
git commit --amend --no-edit

# Or edit commit message

git commit --amend

```text
### Undo Last Commit

```powershell
# Keep changes (soft reset)

git reset --soft HEAD~1

# Discard changes (hard reset - DANGER)

git reset --hard HEAD~1

```text
### Stash Changes

```powershell
# Save work in progress

git stash save "work in progress on feature X"

# List stashes

git stash list

# Apply stash

git stash pop

# Apply specific stash

git stash apply stash@{0}

```text
### Cherry-Pick Commit

```powershell
# Get commit hash

git log --oneline

# Apply specific commit

git cherry-pick <commit-hash>

```text
## Branch Strategy

### Branch Types

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code restructuring

### Branch Naming

```text
feature/autosave-pattern
fix/grade-calculation
hotfix/security-patch
docs/api-documentation
refactor/control-router

```text
### Merge Strategy

- **Features**: Squash merge to main
- **Hotfixes**: Merge commit to main
- **Documentation**: Direct commit or fast-forward merge

## Troubleshooting

### Error: "Smoke tests failed"

```powershell
# Run tests manually to see details

.\COMMIT_READY.ps1 -Mode quick

# Or skip tests (not recommended - use DEV_EASE)

$env:DEV_EASE = 'true'
.\COMMIT_READY.ps1 -Mode quick

```text
### Error: "Git preparation failed"

```powershell
# Verify you have changes

git status

# Check for uncommitted changes

git diff

```text
### Warning: "Found TODOs in modified files"

Review and resolve TODOs before committing, or acknowledge them in commit message.

### Warning: "Documentation appears stale"

Update `README.md`, `CHANGELOG.md`, or `VERSION` file before committing.

## Best Practices

### Before Committing

- [ ] Run `.\COMMIT_READY.ps1 -Mode standard` (comprehensive validation)
- [ ] All tests passing (379 backend + 1189 frontend tests)
- [ ] No compilation errors (Ruff, ESLint, TypeScript)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for features/fixes)
- [ ] Commit message follows conventions

### After Committing

- [ ] Push to remote promptly
- [ ] Verify CI/CD passes on GitHub
- [ ] Check for merge conflicts
- [ ] Update related issues/PRs

### General Guidelines

- **Commit often**: Small, focused commits
- **Test before commit**: Always run smoke tests
- **Write clear messages**: Future you will thank you
- **Reference issues**: Link commits to GitHub issues
- **Keep history clean**: Use rebase for feature branches

## Current Project Status

### Phase 2.3: Integration & UI (✅ COMPLETED)

- Async job queue & audit logging integration
- Frontend job progress monitor and import preview UI
- Comprehensive testing infrastructure (1568 total tests)
- Production-ready deployment runbook

### Quality Infrastructure (✅ OPTIMIZED)

- **CI/CD Pipeline**: Parallel jobs with npm caching (30-45s savings)
- **Test Coverage**: 379 backend + 1189 frontend tests (100% passing)
- **Code Quality**: Ruff, ESLint, TypeScript (0 issues)
- **i18n Validation**: EN/EL translation parity checks
- **Pre-commit Automation**: COMMIT_READY.ps1 with 4 modes

### Next Priorities (Phase 2.4+)

- Fine-grained RBAC permissions system
- API examples & diagrams documentation
- Metrics & load testing suite
- Backup verification automation

## Integration with IDE

### VS Code Git Hooks

Create `.git/hooks/pre-commit` (make executable on Unix):

```bash
#!/bin/sh
pwsh -File ./COMMIT_READY.ps1 -Mode quick

```text
### VS Code Extensions

Recommended extensions:

- GitLens - Enhanced git capabilities
- Conventional Commits - Commit message helper
- Git Graph - Visual git history

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## Related Documentation

- [docs/development/PRE_COMMIT_GUIDE.md](PRE_COMMIT_GUIDE.md) - Unified pre-commit workflow (replaces multiple docs)
- [COMMIT_READY.ps1](../../COMMIT_READY.ps1) - Main pre-commit automation script
- [DOCKER.ps1](../../DOCKER.ps1) - Production deployment script
- [NATIVE.ps1](../../NATIVE.ps1) - Development environment script
- [CHANGELOG.md](../../CHANGELOG.md) - Version history and release notes
- [TODO.md](../../TODO.md) - Current project roadmap and priorities

## CI/CD Integration

The project uses GitHub Actions with optimized performance:

- **Parallel jobs**: Backend and frontend testing run simultaneously
- **npm caching**: 30-45s savings per CI run across all frontend jobs
- **Comprehensive coverage**: 1568 total tests (379 backend + 1189 frontend)
- **Quality gates**: Ruff, ESLint, TypeScript, translation integrity
- **Deployment ready**: Automated Docker builds and health checks

See [CI/CD Pipeline Guide](../deployment/CI_CD_PIPELINE_GUIDE.md) for details.

--------------------------------

**Maintained by**: Development Team
**Questions?**: Create GitHub issue with `documentation` label

