# Git Workflow & Commit Standards

**Last Updated**: 2025-11-25
**Version**: 2.0

This document consolidates all git workflow procedures, commit standards, and automation tools for the Student Management System project.

## Quick Start

### 1. Automated Pre-Commit Workflow (Recommended)

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
```

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
```

## Commit Message Standards

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

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

```
feat(ux): add universal autosave pattern

- Implement autosave for NotesSection and CourseEvaluationRules
- Add visual save indicators with CloudUpload icon
- Reduce API calls by 85% through intelligent debouncing
- Eliminate manual save buttons for cleaner UX

Closes #234
```

```
fix(api): correct grade percentage calculation

The absence penalty was being applied twice when calculating
final percentages. Now applies once at the end as intended.

Fixes #456
```

```
docs: update all references to v2.0 consolidated scripts

- Replace RUN.ps1 → DOCKER.ps1
- Replace INSTALL.ps1 → DOCKER.ps1 -Install
- Update all supporting documentation
- Fix test failures in RBAC and QNAP deployment tests

All legacy script references updated to point to consolidated
DOCKER.ps1 (production) and NATIVE.ps1 (development).
```

## Pre-Commit Automation

### COMMIT_PREP.ps1 - Comprehensive Workflow

**What it does:**
1. Runs full smoke tests (Native + Docker)
2. Cleans up obsolete files and Docker assets
3. Reviews documentation and scripts
4. Generates commit message in `commit_msg.txt`

**Usage:**

```powershell
# Full workflow
.\COMMIT_PREP.ps1

# Quick mode (skip Docker tests)
.\COMMIT_PREP.ps1 -Quick

# Skip specific phases
.\COMMIT_PREP.ps1 -SkipCleanup
.\COMMIT_PREP.ps1 -SkipDocs
.\COMMIT_PREP.ps1 -SkipTests
```

**Output:**
- ✅ All tests passed
- ✅ Cleanup completed
- ✅ Documentation reviewed
- ✅ `commit_msg.txt` ready for commit

### PRE_COMMIT_CHECK.ps1 - Smoke Tests Only

**What it does:**
- Verifies prerequisites (Python, Node.js, Docker)
- Tests Native mode (Backend + Frontend)
- Tests Docker mode (Container + Database)
- Validates TypeScript/ESLint compilation
- Checks git repository status

**Usage:**

```powershell
# Full tests
.\PRE_COMMIT_CHECK.ps1

# Quick mode (Native only)
.\PRE_COMMIT_CHECK.ps1 -Quick
```

## Workflow Examples

### Feature Development

```powershell
# 1. Create feature branch
git checkout -b feature/autosave-notes

# 2. Make changes
# ... edit files ...

# 3. Run automated workflow
.\COMMIT_PREP.ps1

# 4. Review and commit
Get-Content .\commit_msg.txt
git add .
git commit -F commit_msg.txt

# 5. Push branch
git push origin feature/autosave-notes

# 6. Create PR on GitHub
```

### Hotfix

```powershell
# 1. Create hotfix branch from main
git checkout -b hotfix/auth-bug main

# 2. Fix the issue
# ... edit files ...

# 3. Quick test and commit
.\PRE_COMMIT_CHECK.ps1 -Quick
git add .
git commit -m "fix(auth): correct token validation logic"

# 4. Push and merge immediately
git push origin hotfix/auth-bug
# Merge PR on GitHub
```

### Documentation Update

```powershell
# 1. Update docs
# ... edit *.md files ...

# 2. Skip tests for doc-only changes
.\COMMIT_PREP.ps1 -SkipTests

# 3. Commit
git add docs/
git commit -F commit_msg.txt
git push origin main
```

## Release Workflow

### 1. Prepare Release

```powershell
# Update version
echo "1.9.1" > VERSION

# Update CHANGELOG.md
# Move [Unreleased] section to [1.9.1] - YYYY-MM-DD

# Commit version bump
git add VERSION CHANGELOG.md
git commit -m "chore(release): bump version to 1.9.1"
```

### 2. Create Tag

```powershell
# Create annotated tag
git tag -a v1.9.1 -m "Release v1.9.1: Description

- Feature 1
- Feature 2
- Bug fix 1"

# Push tag
git push origin v1.9.1
```

### 3. Create GitHub Release

```powershell
# Use GitHub CLI (if available)
gh release create v1.9.1 --notes-file docs/releases/v1.9.1.md

# Or create manually on GitHub
# Navigate to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new
```

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
```

### Undo Last Commit

```powershell
# Keep changes (soft reset)
git reset --soft HEAD~1

# Discard changes (hard reset - DANGER)
git reset --hard HEAD~1
```

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
```

### Cherry-Pick Commit

```powershell
# Get commit hash
git log --oneline

# Apply specific commit
git cherry-pick <commit-hash>
```

## Branch Strategy

### Branch Types

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code restructuring

### Branch Naming

```
feature/autosave-pattern
fix/grade-calculation
hotfix/security-patch
docs/api-documentation
refactor/control-router
```

### Merge Strategy

- **Features**: Squash merge to main
- **Hotfixes**: Merge commit to main
- **Documentation**: Direct commit or fast-forward merge

## Troubleshooting

### Error: "Smoke tests failed"

```powershell
# Run tests manually to see details
.\PRE_COMMIT_CHECK.ps1

# Or skip tests (not recommended)
.\COMMIT_PREP.ps1 -SkipTests
```

### Error: "Git preparation failed"

```powershell
# Verify you have changes
git status

# Check for uncommitted changes
git diff
```

### Warning: "Found TODOs in modified files"

Review and resolve TODOs before committing, or acknowledge them in commit message.

### Warning: "Documentation appears stale"

Update `README.md`, `CHANGELOG.md`, or `VERSION` file before committing.

## Best Practices

### Before Committing

- [ ] Run `.\COMMIT_PREP.ps1` or `.\PRE_COMMIT_CHECK.ps1`
- [ ] All tests passing
- [ ] No compilation errors
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

## Integration with IDE

### VS Code Git Hooks

Create `.git/hooks/pre-commit` (make executable on Unix):

```bash
#!/bin/sh
pwsh -File ./COMMIT_PREP.ps1 -Quick
```

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

- [PRE_COMMIT_AUTOMATION_SUMMARY.md](../../archive/sessions_2025-11/PRE_COMMIT_AUTOMATION_SUMMARY.md) - Automation implementation details (archived)
- [docs/development/PRECOMMIT_INSTRUCTIONS.md](PRECOMMIT_INSTRUCTIONS.md) - Additional pre-commit guidance
- [CHANGELOG.md](../../CHANGELOG.md) - Version history

---

**Maintained by**: Development Team
**Questions?**: Create GitHub issue with `documentation` label
